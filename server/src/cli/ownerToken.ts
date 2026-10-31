/**
 * `npm run owner-token`: one-time Spotify approval for owner mode.
 *
 * Prints a Spotify login link. After you approve, Spotify sends the browser to
 * http://127.0.0.1:8888/callback. When this runs on your own computer that page
 * is caught automatically; in a codespace the page won't load, so copy its
 * address from the browser's address bar and paste it here. The resulting
 * refresh token is saved to server/.env (git-ignored) as SPOTIFY_REFRESH_TOKEN.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { buildAuthorizeUrl, createPkcePair, exchangeCode, randomToken } from '../spotify/auth.js';

const REDIRECT_URI = process.env.OWNER_REDIRECT_URI || 'http://127.0.0.1:8888/callback';
const ENV_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');

export function parseCallback(input: string, expectedState: string): string {
  const text = input.trim();
  // A bare code is accepted too (no state to check then).
  if (!/[?&=]/.test(text)) return text;
  const url = new URL(text, REDIRECT_URI);
  const error = url.searchParams.get('error');
  if (error) throw new Error(`Spotify returned an error: ${error}`);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('No ?code= in that address. Copy the whole address after approving.');
  if (url.searchParams.get('state') !== expectedState) {
    throw new Error('That address is from a different login attempt. Use the link printed above.');
  }
  return code;
}

export function upsertEnv(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content}${content && !content.endsWith('\n') ? '\n' : ''}${line}\n`;
}

async function main() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(
      'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set (Codespaces secrets or server/.env).',
    );
    process.exit(1);
  }
  const spotify = { clientId, clientSecret, redirectUri: REDIRECT_URI };
  const state = randomToken(16);
  const { verifier, challenge } = createPkcePair();
  const authUrl = buildAuthorizeUrl(spotify, { state, codeChallenge: challenge });

  console.log(`
1. In the Spotify Developer Dashboard (your app → Settings → Redirect URIs), make sure this is added:
     ${REDIRECT_URI}
2. Open this link, log in to Spotify and approve:
     ${authUrl}
3. Spotify then opens ${REDIRECT_URI}?code=…
   - If that page says "Done", you're finished.
   - If it doesn't load (normal in a codespace), copy the full address from the address bar and paste it here.
`);

  const code = await new Promise<string>((resolve, reject) => {
    const { port, hostname, pathname } = new URL(REDIRECT_URI);
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', REDIRECT_URI);
      if (url.pathname !== pathname) return void res.writeHead(404).end();
      try {
        const c = parseCallback(url.toString(), state);
        res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Done. You can close this tab.');
        finish(c);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }).end(String(e));
      }
    });
    server.on('error', () => {
      /* port busy or unavailable: pasting still works */
    });
    server.listen(Number(port), hostname);

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = () =>
      rl.question('Paste the address here: ', (answer) => {
        try {
          finish(parseCallback(answer, state));
        } catch (e) {
          console.error((e as Error).message);
          ask();
        }
      });
    ask();

    function finish(c: string) {
      rl.close();
      server.close();
      resolve(c);
    }
    rl.on('SIGINT', () => reject(new Error('Cancelled')));
  });

  const tokens = await exchangeCode(spotify, code, verifier);
  const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
  writeFileSync(ENV_FILE, upsertEnv(existing, 'SPOTIFY_REFRESH_TOKEN', tokens.refreshToken), {
    mode: 0o600,
  });
  console.log(`
✔ Saved SPOTIFY_REFRESH_TOKEN to server/.env (git-ignored).
  Restart \`npm run dev\` and the app opens as your account, no login needed.
  To keep it for new codespaces, also add it as a Codespaces secret named SPOTIFY_REFRESH_TOKEN
  (the value is in server/.env). Spotify requires redoing this every 6 months.
`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e: unknown) => {
    console.error(`✖ ${(e as Error).message}`);
    process.exit(1);
  });
}

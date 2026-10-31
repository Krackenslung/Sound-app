# Pulse Player

A web music player powered by the Spotify Web API and Web Playback SDK: play music in the browser, control any device, search the catalog, manage your library, and view personal listening stats. Includes a demo mode for visitors without an allowlisted account.

> Spotify Premium is required for playback. Content and metadata are provided by Spotify.

## Stack

React 18 + Vite + TypeScript + Tailwind (client) · Node 22 + Express (server) · Redis sessions · Docker + Caddy.

## Getting started

```bash
cp server/.env.example server/.env   # fill in Spotify credentials
npm install
npm run dev        # client http://127.0.0.1:5173, API proxied to :3001
```

Use `127.0.0.1`, not `localhost` — Spotify rejects `localhost` redirect URIs.

| Command                                           | What it does                                               |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                                     | Client + server with hot reload                            |
| `npm run lint` / `npm run typecheck` / `npm test` | Quality checks                                             |
| `npm run build`                                   | Builds client into `server/public` and compiles the server |
| `npm start`                                       | Production server (API + built client on one origin)       |

In development, `/dev/components` previews the base UI components and design tokens.

Try it without a Spotify account: `/?demo=1` (or **Explore demo mode** on the login page).

## Run it in GitHub Codespaces

1. **Add your Spotify credentials as Codespaces secrets** (never commit them): GitHub → Settings → Codespaces → _Secrets_ → add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` (optionally `SESSION_SECRET`) and give them access to this repository. If you create the codespace first, it also prompts for them.
2. **Create the codespace**: repo page → _Code_ → _Codespaces_ → _Create codespace on_ your branch. The dev container installs Node 22 and runs `npm install`.
3. **Start the app**: `npm run dev`. Port 5173 opens at `https://<codespace-name>-5173.app.github.dev`.
4. **Register that redirect URI** in the Spotify Developer Dashboard (your app → Settings → Redirect URIs):
   `https://<codespace-name>-5173.app.github.dev/api/auth/callback` — print the exact value with
   `echo "https://$CODESPACE_NAME-5173.$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN/api/auth/callback"`.
   Your Spotify account must also be on the app's allowlist (_User Management_).

The server derives `APP_ORIGIN` and `SPOTIFY_REDIRECT_URI` from the codespace automatically, and sessions fall back to memory (no Redis needed). Secrets you added _after_ the codespace started need a rebuild or restart of the codespace to show up. Leave the port **private**; only you can open it. Demo mode (`/?demo=1`) works without any of the above.

## Deployment

Docker image + Compose stack (app, Redis, Caddy) deployed by GitHub Actions on every push to `main`. Runbook: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

See [`CLAUDE.md`](./CLAUDE.md) for the full roadmap, design references and Spotify API constraints.

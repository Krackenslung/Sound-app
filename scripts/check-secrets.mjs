#!/usr/bin/env node
// Fails if the built client (server/public) contains anything secret: server-only env var names,
// OAuth token fields, or the actual secret values (from the environment or server/.env).
// Run after `npm run build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BUILD = join(ROOT, 'server/public');

const FORBIDDEN_NAMES = [
  'SPOTIFY_CLIENT_SECRET',
  'SESSION_SECRET',
  'REDIS_URL',
  'client_secret',
  'refresh_token',
  'refreshToken',
  'code_verifier',
];

function secretValues() {
  const env = { ...process.env };
  const file = join(ROOT, 'server/.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return ['SPOTIFY_CLIENT_SECRET', 'SESSION_SECRET']
    .map((k) => [k, env[k]])
    .filter(([, v]) => v && v.length >= 8);
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(js|mjs|css|html|json|webmanifest|map|svg|txt)$/.test(name)) yield p;
  }
}

if (!existsSync(BUILD)) {
  console.error(`No build at ${BUILD}. Run \`npm run build\` first.`);
  process.exit(2);
}

const values = secretValues();
const problems = [];
let scanned = 0;
for (const file of files(BUILD)) {
  scanned++;
  const text = readFileSync(file, 'utf8');
  for (const name of FORBIDDEN_NAMES)
    if (text.includes(name)) problems.push(`${file}: contains "${name}"`);
  for (const [key, value] of values)
    if (text.includes(value)) problems.push(`${file}: contains the value of ${key}`);
}

if (problems.length) {
  console.error(`✗ Secrets found in the client build:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `✓ No secrets in the client build (${scanned} files scanned; ${values.length} secret value(s) checked).`,
);

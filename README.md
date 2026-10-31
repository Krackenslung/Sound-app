# Pulse Player

A web music player powered by the Spotify Web API and Web Playback SDK: play music in the browser, control any device, search the catalog, manage your library, and view personal listening stats. Includes a demo mode for visitors without an allowlisted account.

> Spotify Premium is required for playback. Content and metadata are provided by Spotify.

## Stack

React 18 + Vite + TypeScript + Tailwind (client) · Node 20 + Express (server) · Redis sessions · Docker + Caddy.

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

See [`CLAUDE.md`](./CLAUDE.md) for the full roadmap, design references and Spotify API constraints.

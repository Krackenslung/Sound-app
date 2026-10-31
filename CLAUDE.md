# CLAUDE.md — Pulse Player (Spotify-powered web music player)

> Working name: **Pulse Player**. Do not put "Spotify" in the app's name (Spotify's developer branding rules forbid it); show Spotify attribution/logo where content is displayed.

## Project overview

A deployed web app that lets a logged-in Spotify Premium user play music in the browser (Web Playback SDK), control playback on any device, search the catalog, manage their library/playlists, and view personal listening stats. It doubles as a portfolio piece, so it needs a **demo mode** for visitors who aren't allowlisted.

## How to work in this repo (rules for Claude)

1. Work **one phase at a time**, in order. Do not start a phase until the previous phase's "Done when" checklist passes.
2. At the end of each phase: run lint, typecheck and tests, then tick the boxes in this file and add a one-line entry to `## Progress log`.
3. Never call an endpoint listed under **Forbidden endpoints**. If a feature seems to need one, stop and propose an alternative.
4. Never expose `SPOTIFY_CLIENT_SECRET` or refresh tokens to the client. The browser only ever receives short-lived access tokens.
5. Keep commits small and scoped to one feature (`feat(player): add seek bar`). Conventional Commits.
6. If the Spotify docs disagree with this file, the docs win — update this file and note it in the progress log.
7. **The Figma file is the UI source of truth.** Before building any screen or component, pull its frame from Figma (Figma MCP `get_design_context` with the node ID from the **Design** section) and match it. Use the design tokens below — no hardcoded hex values in components.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript, React Router (v7, `react-router` package), TanStack Query, Zustand (player state), Tailwind CSS |
| Backend | Node.js 22 LTS + Express + TypeScript (Node 20 is EOL since April 2026, and Vitest 5 needs ≥ 22.12) |
| Sessions | `express-session` + Redis store (`connect-redis`). **Never MemoryStore in production.** |
| Testing | Vitest + React Testing Library (client), Vitest + Supertest (server), MSW for mocking Spotify |
| Deploy | Docker multi-stage image, docker-compose (app + redis + caddy) on a DigitalOcean droplet, Caddy for automatic HTTPS |
| CI/CD | GitHub Actions: lint → typecheck → test → build image → deploy over SSH |
| Icons | `lucide-react` (the Figma icons are Lucide-style; use the matching Lucide names) |
| Font | Plus Jakarta Sans via `@fontsource/plus-jakarta-sans` (400, 500, 600, 700, 800) |

## Design (Figma)

**File:** [Pulse Player — App Design](https://www.figma.com/design/XONB16lSm2WK3EJ8Ix8WnY) · fileKey `XONB16lSm2WK3EJ8Ix8WnY`

Dark-only theme, violet accent. Desktop frames are 1440×900; mobile frames are 390×844.

### Screens

| Frame | Node ID | Route / state | Phase |
|---|---|---|---|
| 01 · Login | `5:83` | `/login` | 1 |
| 02 · Home | `5:145` | `/` | 2–3 |
| 03 · Now Playing + Devices | `6:323` | `/now-playing` + device picker popover | 2–3 |
| 04 · Search | `6:639` | `/search?q=` | 3 |
| 05 · Library · Liked Songs | `7:803` | `/library` | 4 |
| 06 · Stats | `7:1077` | `/stats` | 5 |
| 07 · Mobile · Now Playing | `8:1250` | `/now-playing` < 768px | 6 |
| 08 · Mobile · Home (Demo mode) | `8:1320` | `/` < 768px, demo banner | 6 |

### Components (Figma → code)

| Figma component | Node ID | React component | Notes |
|---|---|---|---|
| Button (Primary / Secondary / Ghost) | `3:8` | `ui/Button.tsx` | `variant` prop, pill shape, 14px/28px padding |
| NavItem (Default / Active) | `3:22` | `layout/NavItem.tsx` | active = surface-2 bg + accent dot |
| Chip (Default / Selected) | `3:27` | `ui/Chip.tsx` | search filters, library tabs |
| TrackRow (Default / Playing) | `3:50` | `tracks/TrackRow.tsx` | props: index, title, artist, album, duration; `hideAlbum` for narrow layouts |
| AlbumCard | `3:51` | `cards/AlbumCard.tsx` | 184px wide, 160px art |
| ArtistCard | `3:56` | `cards/ArtistCard.tsx` | circular art, name, rank |
| Sidebar | `4:12` | `layout/Sidebar.tsx` | 248px wide; becomes bottom tab bar < 768px |
| PlayerBar | `4:111` | `player/PlayerBar.tsx` | 88px tall, 3 columns (now playing · controls 560px · extras) |
| Components section (all of the above + Foundations) | `2:25` | — | icons, color swatches, type scale |

### Design tokens

Define these as CSS variables in `client/src/styles/tokens.css` and map them in `tailwind.config.ts` (`colors: { bg: 'var(--color-bg)', … }`).

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#0B0B10` | app background |
| `--color-surface` | `#14141C` | sidebar, player bar, cards |
| `--color-surface-2` | `#1D1D28` | inputs, chips, active nav, playing row |
| `--color-surface-hover` | `#262634` | hover states, progress track |
| `--color-border` | `#2B2B3A` | dividers, outlines |
| `--color-text-primary` | `#F4F4F8` | main text, icons |
| `--color-text-secondary` | `#A1A1B5` | artist names, metadata |
| `--color-text-muted` | `#84849A` | overlines, table headers — was `#6B6B80` in Figma (3.5:1); raised in Phase 6 for WCAG AA. **Update Figma.** |
| `--color-accent` | `#8B5CF6` | primary buttons, progress fill, playing state |
| `--color-accent-hover` | `#A78BFA` | hover, accent text on dark |
| `--color-accent-2` | `#F472B6` | liked (heart) state |
| `--color-warning` | `#FBBF24` | demo-mode banner, notices |
| `--color-success` | `#34D399` | success toasts |
| `--color-on-accent` | `#FFFFFF` | text/icons on accent or gradient fills (present in Figma, added in Phase 0) |
| `--color-accent-soft` | accent @ 15% | device chip, active device row (from Figma `6:323`, added in Phase 2) |
| `--color-accent-strong` | `#7F4FF0` (hover `#6F42E0`) | primary button fill — white on `#8B5CF6` is only 4.23:1 (added in Phase 6). **Update Figma.** |
| `--color-art` / `--color-art-glow` | `#2E2A7A` / accent (defaults) | set at runtime from the album art (mini player, mobile Now Playing) |
| `--color-spotify-green` | `#1ED760` | Spotify logo only (attribution) |

| Text style | Size / line height | Weight | Letter spacing |
|---|---|---|---|
| Display | 48 / 56 | 800 | -2% |
| H1 | 32 / 40 | 700 | -1.5% |
| H2 | 22 / 28 | 700 | -1% |
| H3 | 16 / 24 | 600 | -0.5% |
| Body | 14 / 20 | 400 | 0 |
| Body Strong | 14 / 20 | 600 | 0 |
| Caption | 12 / 16 | 500 | 0 |
| Overline | 11 / 16 | 700, uppercase | 8% |

Radii: cards 12–16px, album art 6–8px (rows) / 16–20px (hero), buttons and chips fully rounded. Main content padding: 40px horizontal, 32px vertical; section gap 32px.

### Design notes

- Album art in Figma is placeholder gradients — in code always use the real `images[]` URL from Spotify; fall back to a gradient only when there is no image.
- Sample track and artist names in Figma are invented; demo-mode `fixtures/` can reuse them.
- Add the official Spotify logo/attribution (from Spotify's design guidelines) wherever Spotify content is shown — the Figma file only has a text placeholder.
- Stats tiles only show values the API can provide (top genre, genre count, #1 track, average top-track length). Do not add "minutes listened" or similar — Spotify doesn't expose listening history beyond the last 50 plays.

## Repo layout

```
/
├── client/                 # Vite React app
│   └── src/
│       ├── api/            # typed fetch wrappers -> /api/*
│       ├── components/     # ui/, layout/, player/, tracks/, cards/ (see Design → Components)
│       ├── styles/         # tokens.css, globals.css
│       ├── features/       # auth, player, search, library, stats, demo
│       ├── hooks/
│       ├── store/          # zustand stores
│       └── pages/
├── server/
│   └── src/
│       ├── routes/         # auth.ts, me.ts, player.ts, search.ts, library.ts, stats.ts
│       ├── spotify/        # spotifyClient.ts (fetch + refresh + retry), types.ts
│       ├── middleware/     # requireAuth, errorHandler, rateLimit
│       └── index.ts
├── fixtures/               # demo-mode mock JSON
├── docker/                 # Dockerfile, Caddyfile
├── docker-compose.yml
└── CLAUDE.md
```

## Commands

See `docs/DEPLOYMENT.md` for the production runbook (droplet, DNS, Spotify dashboard, GitHub secrets, operations).

```bash
npm install            # root, installs both workspaces
npm run dev            # client on 127.0.0.1:5173 with /api proxied to server on :3001
npm run lint
npm run typecheck
npm test
npm run test:coverage  # server coverage gate (>= 70% on src/spotify and src/routes)
npm run build
npm run check:secrets  # after build: fails if the client bundle contains secrets          # builds client into server/public, compiles server
npm start              # production: Express serves API + built client on one origin
docker compose up -d --build
```

## Environment variables (`server/.env`, never committed)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/api/auth/callback   # prod: https://music.gallardoapps.com/api/auth/callback
SESSION_SECRET=           # long random string
REDIS_URL=redis://redis:6379
APP_ORIGIN=http://127.0.0.1:5173
NODE_ENV=development
```

Commit a `server/.env.example` with the same keys and empty values.

## Spotify API constraints (read before writing any API code)

- **Development Mode**: app owner must have active Premium; max **5 allowlisted users**; quota is shared per developer account.
- **Playback** (Web Playback SDK and `/me/player/*` writes) requires each user to have **Premium**.
- **Search** returns max **10 results per request** — paginate with `offset`.
- **Refresh tokens expire 6 months** after the original authorization; refreshing does not reset that. On `invalid_grant`, destroy the session and send the user to login.
- **Redirect URIs** must be HTTPS in production. In dev use `127.0.0.1`, not `localhost`.
- **Playlist items** can only be read for playlists the user owns or collaborates on. Create playlists with `POST /me/playlists`.
- Library and playlist endpoints were renamed/consolidated in the Feb 2026 migration — check the [migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) before implementing Phase 4. Confirmed for Phase 4 (API reference via search + developer reports — re-check against the official guide when reachable):
  - Save/remove/check: `PUT` / `DELETE /me/library?uris=…` and `GET /me/library/contains?uris=…` — `uris` is a comma-separated **query parameter** (not a JSON body), max **40**. Replaces `/me/tracks`, `/me/albums`, `/me/following` writes.
  - Listing Liked Songs / saved albums (`GET /me/tracks`, `GET /me/albums`) is **deprecated** and may be unavailable for Development Mode apps. The server maps a 403/404/410 there to `501 ENDPOINT_UNAVAILABLE`; the client explains and still lets you play Liked Songs via the `spotify:user:{id}:collection` context.
  - Playlists: `GET /me/playlists` (`/users/{id}/playlists` returns 403), `POST /me/playlists` to create, `/playlists/{id}/tracks` → `/playlists/{id}/items` (add: body `{ uris }`; remove: body `{ items: [{ uri }], snapshot_id? }`). Playlist objects use `items.total` instead of `tracks.total`, and each entry's `track` is now `item` (`track` may linger as a deprecated alias or even a boolean).
- **Fields reported removed for Development Mode apps (Feb 2026, unverified — third-party sources):** `popularity` (artist/track/album), artist `followers` and **artist `genres`** (reports conflict for `GET /artists/{id}`; `GET /me/top/artists` is reported to omit it), album `label`/`external_ids`/`available_markets`, and user `country`/`product`. Code must treat these as optional: `/api/me` returns `product: null` and artists return `genres: null` when missing (the Stats page then swaps the genre tiles/breakdown for artist-based ones), and the client then tries the Web Playback SDK and relies on its `account_error` to detect non-Premium accounts.

### Forbidden endpoints (403 for new apps — do not use)

`/recommendations`, `/audio-features`, `/audio-analysis`, `/artists/{id}/related-artists`, `/artists/{id}/top-tracks`, `/browse/featured-playlists`, `/browse/categories*`, `/browse/new-releases`, batch-get endpoints (`/tracks?ids=`, `/albums?ids=`, `/artists?ids=`), other users' profiles/playlists, `preview_url` (returns null).

### OAuth scopes

```
streaming user-read-email user-read-private
user-read-playback-state user-modify-playback-state user-read-currently-playing
user-read-recently-played user-top-read
user-library-read user-library-modify
playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private
```

### Error handling contract (server `spotifyClient.ts`)

| Status | Behavior |
|---|---|
| 401 | Refresh once, retry once; if refresh fails → 401 to client → client redirects to login |
| 403 | Return `{ code: "FORBIDDEN" }`; client shows "Premium required" or "Not allowlisted — try demo mode" based on the message |
| 404 on `/me/player/*` | "No active device" → client opens the device picker |
| 429 | Respect `Retry-After`; if body reason is `QUOTA_EXCEEDED`, surface a friendly banner, don't retry |
| 5xx | Retry with backoff (max 2), then error toast |

---

## Phase 0 — Project setup

- [ ] Create the app in the Spotify Developer Dashboard (Web API + Web Playback SDK); register dev redirect URI; add your own account to the allowlist
- [x] npm workspaces monorepo with `client/` and `server/`
- [x] TypeScript, ESLint, Prettier, Vitest configured in both
- [x] Vite dev proxy: `/api` → `http://127.0.0.1:3001`
- [x] Express app with `/api/health`, centralized error handler, `helmet`, `cors` locked to `APP_ORIGIN`
- [x] `.env.example`, `.gitignore`, README stub
- [x] Design foundations: `tokens.css` + Tailwind theme from **Design tokens**, Plus Jakarta Sans, `lucide-react`
- [x] Base UI components matching Figma: `Button`, `Chip` (with a `/dev/components` preview page)
- [x] App shell: `Sidebar` + main area + `PlayerBar` placeholder, laid out like frame `5:145`

**Done when:** `npm run dev` serves the empty app shell matching the Figma layout and `/api/health` returns `{ ok: true }`; lint/typecheck/test pass.

## Phase 1 — Authentication

- [x] `GET /api/auth/login` → redirect to Spotify authorize with scopes, `state` (stored in session), and PKCE challenge
- [x] `GET /api/auth/callback` → validate `state`, exchange code, store tokens + expiry in the Redis-backed session, redirect to `/`
- [x] `GET /api/auth/token` → returns a valid access token (refreshing if < 60 s left) for the Web Playback SDK
- [x] `POST /api/auth/logout` → destroy session
- [x] `requireAuth` middleware; `GET /api/me` returns profile incl. `product` (premium/free)
- [x] Session cookie: `httpOnly`, `sameSite=lax`, `secure` in prod
- [x] Client: login page matching Figma `5:83` (Continue with Spotify / Explore demo mode / Premium notice), auth context, protected routes, banner if user is not Premium
- [x] Sidebar user card shows real name, avatar and plan

**Done when:** you can log in, refresh the page and stay logged in, log out, and an expired access token refreshes transparently (test with a mocked expiry).

## Phase 2 — In-browser player & controls (MVP core)

- [x] Load `https://sdk.scdn.co/spotify-player.js`; create `Spotify.Player` with `getOAuthToken` calling `/api/auth/token`
- [x] Handle events: `ready` (store `device_id`), `not_ready`, `player_state_changed`, `initialization_error`, `authentication_error`, `account_error`, `playback_error`
- [x] Call `player.activateElement()` on the first user click (needed on mobile browsers)
- [x] On ready, transfer playback to the browser device (`PUT /me/player`) — skipped if another device is already playing, so opening the app doesn't interrupt music elsewhere
- [x] `PlayerBar` matching Figma `4:111`: play/pause, next/previous, seek bar, volume, shuffle, repeat (accent color when active), like heart
- [x] `NowPlaying` view matching Figma `6:323`: large art, title, artists, actions, progress (interpolated locally between state events)
- [x] Home page matching Figma `5:145` (greeting, recently played cards, top tracks) with `NavItem`, `AlbumCard`, `TrackRow`
- [x] Zustand `playerStore` is the single source of truth for player state

**Done when:** a Premium account can start a track from a hardcoded URI and use every control; state stays in sync with the Spotify desktop app.

## Phase 3 — Search, queue & devices

- [x] `GET /api/search?q=&type=&offset=` (limit fixed at 10) with "Load more"
- [x] Search page matching Figma `6:639`: debounced input, `Chip` filters for Tracks / Albums / Artists / Playlists, top result card, songs list, "Load more results"
- [x] Click a track → play it; "Add to queue" action (`POST /me/player/queue`)
- [x] Queue panel (`GET /me/player/queue`) as on the Now Playing frame
- [x] Device picker popover anchored to the PlayerBar devices icon, as in Figma `6:323` (`GET /me/player/devices`, `PUT /me/player` to transfer)
- [x] Album page (`GET /albums/{id}`) and artist page (`GET /artists/{id}`, `GET /artists/{id}/albums`) — no top tracks on the artist page (`/artists/{id}/top-tracks` is forbidden)

**Done when:** you can search, play, queue, and move playback between browser and phone.

## Phase 4 — Library & playlists

- [x] Re-read the Feb 2026 migration guide; confirm current library/playlist endpoint paths and field names — developer.spotify.com is blocked in the build environment, so confirmed via the API reference (search snippets) and developer reports; see the constraints section
- [x] Library page matching Figma `7:803`: tabs, Liked Songs hero, play/shuffle actions, track table with header row
- [x] Liked Songs: list (paginated), save/unsave heart toggle on every track row
- [x] My playlists list (`GET /me/playlists`) and playlist detail (owned/collaborative only)
- [x] Create playlist (`POST /me/playlists`), add/remove tracks
- [x] Optimistic updates with TanStack Query + rollback on error

**Done when:** liking a track in the app shows up in the Spotify app, and a playlist created here appears there.

## Phase 5 — Personal stats

- [x] Stats page matching Figma `7:1077`: summary tiles, `ArtistCard` row, top tracks, genre breakdown card
- [x] Top tracks and top artists with `time_range` switcher (segmented control): `short_term` (4 wks), `medium_term` (6 mo), `long_term` (all time)
- [x] Recently played (`GET /me/player/recently-played`)
- [x] Genre breakdown chart built from top artists' `genres` — plain HTML/CSS bars, as drawn in Figma `7:1347` (no chart library needed); falls back to an artist breakdown when Spotify omits `genres`
- [x] "Monthly playlist" generator: group liked songs by `added_at` month → create a playlist on confirm — server walks Liked Songs only as far back as needed (cap 2,000), months are UTC

**Done when:** the Stats page renders for a real account and the generator creates a correct playlist.

## Phase 6 — Polish & demo mode

- [x] **Demo mode**: if not logged in or the API returns the "user not registered" 403, offer "Try demo" — serves `fixtures/*.json` through the same client API layer (flag in a context, no real API calls) — `api()` routes to an in-browser backend (`features/demo/demoBackend.ts`, lazy-loaded) with simulated playback on a "Demo player" device; `/?demo=1` opens it directly
- [x] Keyboard shortcuts: Space play/pause, ←/→ seek ±10 s, Shift+←/→ prev/next, `/` focus search
- [x] Dynamic accent color extracted from the album art — sets `--color-art`/`--color-art-glow` (mini player, mobile Now Playing gradient, desktop art glow); darkened until secondary text keeps ≥ 4.5:1
- [x] Demo banner matching Figma `8:1320`
- [x] Responsive layout < 768px matching Figma `8:1250` and `8:1320`: sidebar → bottom tab bar, PlayerBar → mini player, full-screen Now Playing
- [x] Skeleton loaders, empty/error states in the same visual style
- [x] PWA manifest + icons, installable (manifest + 192/512/maskable/apple-touch icons; no service worker — current Chrome doesn't require one to install)
- [x] Accessibility pass: labels on icon buttons, focus rings, contrast — axe-core clean (WCAG 2.1 AA) on all main pages at 1440 and 390 px; required raising `--color-text-muted` and adding `--color-accent-strong` (see tokens)
- [x] Spotify attribution/logo per branding guidelines — official icon (Spotify Green, ≥ 21px) + "Open Spotify" links on album/artist/playlist/Now Playing/Liked Songs, "Open in Spotify" in track menus, credit on Login and Stats; hidden in demo mode (sample IDs)

**Done when:** Lighthouse ≥ 90 for Performance, Accessibility and Best Practices; demo mode works fully logged out.

## Phase 7 — Testing & hardening

- [x] Server unit tests: token refresh, retry/backoff, 429 handling, `invalid_grant` logout
- [x] Route tests with Supertest + MSW-mocked Spotify
- [x] Client tests for PlayerBar, search, and auth redirect
- [x] `express-rate-limit` on `/api/*`; request size limits — 300 req/min/IP on `/api/*`, 20/min on login/callback, `/api/health` exempt, JSON `429 RATE_LIMITED` + `Retry-After`; JSON bodies capped at 16 KB (`413 PAYLOAD_TOO_LARGE`), bad JSON → `400 INVALID_JSON`
- [x] CSP via `helmet` allowing `sdk.scdn.co`, `i.scdn.co` (images), `api.spotify.com` — strict (`'self'`, no `unsafe-inline`); also `mosaic.scdn.co` + `*.spotifycdn.com` for playlist/newer images and `frame-src sdk.scdn.co` for the SDK's playback iframe; verified zero violations on the production build (fonts kept out of `data:` URIs)
- [x] Structured logging (pino), no tokens in logs — `pino-http` logs method, sanitised URL (OAuth `code`/`state` redacted), status, timing; never headers or bodies; token fields redacted; a test runs login → refresh → logout and greps the logs for every secret

**Done when:** coverage ≥ 70% on `server/src/spotify` and `server/src/routes`; no secrets in logs or client bundle (`grep` the build).

## Phase 8 — Deployment

- [x] Multi-stage `Dockerfile`: build client + server, run as non-root on `node:22-alpine` (was `node:20-alpine`; see Tech stack) — prod deps only (23.6 MB `node_modules`), `HEALTHCHECK` on `/api/health`, graceful SIGTERM shutdown
- [x] `docker-compose.yml`: `app`, `redis` (volume), `caddy` (ports 80/443, volume for certs) — app read-only, all capabilities dropped, starts after Redis is healthy; Caddy starts after the app is healthy
- [x] `Caddyfile`: `music.gallardoapps.com { reverse_proxy app:3001 }` — plus `encode zstd gzip` and `lb_try_duration 10s` so redeploys don't drop requests; domain overridable via `PULSE_DOMAIN`
- [ ] DNS A record for `music.gallardoapps.com` → droplet IP
- [ ] Add the production redirect URI in the Spotify dashboard
- [x] Set `trust proxy` in Express so secure cookies work behind Caddy (since Phase 1; verified the `Secure` cookie is set through Caddy)
- [x] GitHub Actions: on push to `main` → lint/typecheck/test → build & push image to GHCR → SSH to droplet → `docker compose pull && docker compose up -d` (`.github/workflows/deploy.yml`; CI also runs on PRs; deploys the exact `sha-<commit>` image, then health-checks over HTTPS)
- [ ] Production `.env` on the server only; uptime check on `/api/health` — uptime check done (`.github/workflows/uptime.yml`, every 15 min); the `.env` is a manual step (docs/DEPLOYMENT.md §4)
- [ ] Allowlist the accounts that should have real access (max 5)

**Done when:** `https://music.gallardoapps.com` loads over HTTPS, login works end to end, demo mode works for everyone else, and a push to `main` deploys automatically.

---

## Progress log

<!-- One line per finished phase: YYYY-MM-DD — Phase N done — notes -->
- 2026-10-31 — UI design v1 approved in Figma (8 screens, tokens, components) — added Design section and design tasks to phases
- 2026-10-31 — Phase 0 done (except Spotify dashboard setup, which is manual) — monorepo, Express health/helmet/cors, tokens + Tailwind theme, Button/Chip/NavItem, app shell from frame 5:145; added `--color-on-accent` token from Figma; Tailwind pinned to v3 to keep `tailwind.config.ts`
- 2026-10-31 — Phase 1 done (verified with MSW-mocked Spotify; not yet run against real Spotify — needs dashboard app + credentials) — PKCE + client secret on the token endpoint, refresh-token rotation handled, per-session refresh dedupe, session id regenerated on login, `trust proxy` set in production; in dev the server falls back to in-memory sessions when `REDIS_URL` is unset; 'Explore demo mode' is disabled until Phase 6; developer.spotify.com was unreachable from the build environment, so auth details follow the OAuth/PKCE spec and should be re-checked against the docs
- 2026-10-31 — Phase 2 code complete; "Done when" still needs a real Premium account (verified with a mocked SDK + MSW only) — SDK lifecycle in `PlayerProvider`, controls go to the SDK when this browser is active and to the Web API otherwise, 5 s polling keeps state in sync with other devices, like heart uses `/me/library` (Feb 2026 endpoints, found via search because developer.spotify.com was unreachable — re-check the query param format), queue/devices buttons stay disabled until Phase 3, "Next up" uses the SDK track window until the queue API lands
- 2026-10-31 — Phase 3 code complete; "Done when" (search → play → queue → move playback to phone) still needs a real account — search (limit 10, per-type infinite "Load more"), top result + songs + albums, track menu (add to queue / go to album / go to artist), queue panel from `/me/player/queue`, device picker popover (opens automatically on `NO_ACTIVE_DEVICE`), album + artist pages; `product` missing from `/me` is now treated as "unknown" instead of "free" after reports it was removed in the Feb 2026 changes
- 2026-10-31 — Phase 4 code complete; "Done when" (like here → shows in Spotify; playlist created here → appears there) still needs a real account — Library page (tabs, Liked Songs hero, play/shuffle, track table with header), saved albums, my playlists + playlist page, create playlist dialog, add to / remove from playlist, sidebar playlist list, optimistic updates with rollback (like/unlike incl. the Liked Songs list, create, add, remove); endpoint details confirmed via search because developer.spotify.com is still blocked; `GET /me/tracks`/`/me/albums` are deprecated, so the UI degrades gracefully if Spotify refuses them; "Create monthly playlist" button is shown but disabled until Phase 5
- 2026-10-31 — Phase 5 code complete; "Done when" (Stats renders for a real account; generator creates a correct playlist) still needs a real account — Stats page from frame 7:1077 (summary tiles, top artists, top tracks, breakdown card, recently played), `time_range` segmented control in the URL, monthly playlist dialog on Library with per-month counts; developer reports say Feb 2026 removed artist `genres` for Development Mode apps, so genre tiles/breakdown fall back to artist-based stats when no genres come back (tiles still only show API-provided values); breakdown is HTML/CSS bars per Figma instead of Recharts
- 2026-10-31 — Phase 6 done — "Done when" met locally on the production build: Lighthouse (mobile) Login 98/100/96, Home 93/100/100, Search 93/100/100, Stats desktop 100/100/100 (Perf/A11y/BP; Login BP 96 is the expected 401 from `/api/me` while logged out), and demo mode works fully logged out with zero network calls (tested). Added: demo mode + banner, mobile layout (tab bar, mini player, full-screen Now Playing, quick picks), keyboard shortcuts, album-art color, Spotify attribution, PWA manifest, axe-clean a11y, route-level code splitting (main JS 415 → 288 kB). Design deviations for WCAG AA: `--color-text-muted` → `#84849A`, primary buttons use new `--color-accent-strong`, playing-row text uses `accent-hover` — Figma should be updated to match
- 2026-10-31 — Phase 7 done — "Done when" met: coverage src/spotify 95% stmts / 86% branches, src/routes 94% / 75% (thresholds enforced in `server/vitest.config.ts`); `npm run check:secrets` finds nothing in the client build (verified it fails on a planted secret); logging test proves no tokens/cookies/OAuth codes/client secret in logs. Added Spotify client unit tests (refresh-once, 5xx backoff 250/500 ms then 502, 429 Retry-After/RATE_LIMITED/QUOTA_EXCEEDED, invalid_grant session destroy, refresh dedupe, PKCE), rate limiting + 16 KB body cap, strict CSP (checked in a real browser), pino logging. 251 tests total
- 2026-10-31 — Phase 8 repo work done; "Done when" needs the manual steps (droplet, DNS, Spotify dashboard redirect URI + allowlist, server `.env`, GitHub `production` environment secrets) — see docs/DEPLOYMENT.md. Built and ran the image and the full compose stack locally: health, SPA, CSP/HSTS, HTTP→HTTPS, gzip (288 → 98 kB), `Secure` session cookie through Caddy, Redis sessions, no secrets in logs, clean SIGTERM shutdown, zero failed requests across an app redeploy. Switched to Node 22 LTS (Node 20 EOL; Vitest 5 requires ≥ 22.12). Workflow YAML validated with Prettier + PyYAML (actionlint couldn't be downloaded in this environment)
- 2026-10-31 — Login page skipped by default (user request): logged-out visitors land in demo mode, "Log in with Spotify" lives in the account menu/demo banner, Spotify login errors still show the login page; `VITE_SHOW_LOGIN=true` restores it. Added Codespaces devcontainer; server derives the Codespaces origin/redirect URI

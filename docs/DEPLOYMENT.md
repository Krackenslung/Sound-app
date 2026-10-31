# Deploying Pulse Player

Production runs on one DigitalOcean droplet with Docker Compose:

```
Internet ──443/80──▶ caddy (HTTPS, Let's Encrypt) ──▶ app :3001 (Express API + built client) ──▶ redis (sessions)
```

Every push to `main` runs CI, builds `ghcr.io/krackenslung/sound-app:sha-<commit>` and deploys it over SSH
(`.github/workflows/deploy.yml`). Steps 1–6 below are one-time setup.

---

## 1. Create the droplet

- Ubuntu 24.04 LTS, 1 GB RAM is enough. Add your SSH key.
- Install Docker Engine + the Compose plugin (official repo):

  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

- Create a deploy user that can run Docker, and the app directory:

  ```bash
  adduser --disabled-password --gecos "" deploy
  usermod -aG docker deploy
  mkdir -p /opt/pulse/docker && chown -R deploy:deploy /opt/pulse
  ```

- Firewall — only SSH, HTTP and HTTPS:

  ```bash
  ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw enable
  ```

## 2. DNS

Create an **A record** `music.gallardoapps.com → <droplet IPv4>` (and an AAAA record if the droplet has IPv6).
Wait until `dig +short music.gallardoapps.com` returns the droplet IP **before the first deploy** — Caddy
needs it to obtain the certificate.

## 3. Spotify Developer Dashboard

In your app's settings:

- **Redirect URIs:** add `https://music.gallardoapps.com/api/auth/callback` (keep the dev one,
  `http://127.0.0.1:5173/api/auth/callback`).
- **User Management:** add the Spotify accounts that should have real access (max **5** in Development
  Mode) — name + the email of their Spotify account. Everyone else can use demo mode.

## 4. Production `.env` (on the server only)

As `deploy`, create `/opt/pulse/.env` — never commit it:

```bash
cat > /opt/pulse/.env <<'ENV'
SPOTIFY_CLIENT_ID=<from the dashboard>
SPOTIFY_CLIENT_SECRET=<from the dashboard>
SPOTIFY_REDIRECT_URI=https://music.gallardoapps.com/api/auth/callback
SESSION_SECRET=<openssl rand -base64 48>
APP_ORIGIN=https://music.gallardoapps.com
ENV
chmod 600 /opt/pulse/.env
```

`NODE_ENV`, `PORT` and `REDIS_URL` are set by `docker-compose.yml`. Optional: `LOG_LEVEL` (default `info`).

## 5. GitHub configuration

**Deploy key** — on your own machine:

```bash
ssh-keygen -t ed25519 -f pulse_deploy -N "" -C "github-actions deploy"
```

Append `pulse_deploy.pub` to `/home/deploy/.ssh/authorized_keys` on the droplet.

**Host key** — pin it (no trust-on-first-use). Run `ssh-keyscan -t ed25519 <droplet-ip>` and check the
fingerprint against the droplet console (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`).

In the repo: **Settings → Environments → New environment → `production`**, then add:

| Kind                | Name                 | Value                                    |
| ------------------- | -------------------- | ---------------------------------------- |
| Secret              | `DEPLOY_HOST`        | droplet IP or hostname                   |
| Secret              | `DEPLOY_USER`        | `deploy`                                 |
| Secret              | `DEPLOY_SSH_KEY`     | contents of `pulse_deploy` (private key) |
| Secret              | `DEPLOY_KNOWN_HOSTS` | the `ssh-keyscan` line from above        |
| Variable (optional) | `PULSE_DOMAIN`       | defaults to `music.gallardoapps.com`     |
| Variable (optional) | `DEPLOY_PATH`        | defaults to `/opt/pulse`                 |

You can add required reviewers to the `production` environment if you want to approve each deploy.

The image is pushed to GHCR with the workflow's `GITHUB_TOKEN`; the droplet logs in with that same
short-lived token during each deploy and logs out afterwards, so no registry credentials live on the server.

## 6. First deploy

Merge to `main` (or **Actions → CI / Deploy → Run workflow** on `main`). The workflow copies
`docker-compose.yml` and `docker/Caddyfile` to `/opt/pulse`, pulls the image for that commit, runs
`docker compose up -d`, and finally checks `https://music.gallardoapps.com/api/health`.

Then check by hand: open the site, log in with an allowlisted account, and try demo mode in a private window.

---

## Operations

All commands as `deploy` in `/opt/pulse`.

| Task               | Command                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status             | `docker compose ps`                                                                                                                                           |
| App logs (JSON)    | `docker compose logs -f app` (pretty: `… \| jq -r '.time + " " + .msg'`)                                                                                      |
| Restart app        | `docker compose restart app`                                                                                                                                  |
| Roll back          | `PULSE_IMAGE=ghcr.io/krackenslung/sound-app:sha-<older-commit> docker compose up -d app` (needs `docker login ghcr.io` with a token that has `read:packages`) |
| Update Redis/Caddy | `docker compose pull redis caddy && docker compose up -d`                                                                                                     |
| Free disk          | `docker image prune -f`                                                                                                                                       |

- **Data:** `redis-data` only holds login sessions (losing it just logs everyone out). `caddy-data` holds the
  TLS certificates — keep it so Caddy doesn't re-issue on every restart.
- **Health:** the image has a Docker `HEALTHCHECK`; Caddy waits for it before starting. During a deploy Caddy
  holds requests for up to 10 s while the app restarts, so redeploys don't drop requests.
- **Uptime:** `.github/workflows/uptime.yml` checks `/api/health` every 15 minutes and fails (→ GitHub
  notification) when the site is down. GitHub pauses scheduled workflows after 60 days without repository
  activity, so consider also adding a free external monitor (e.g. UptimeRobot) on the same URL.

## Troubleshooting

| Symptom                                                   | Likely cause                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Caddy logs ACME/certificate errors                        | DNS not pointing at the droplet yet, or ports 80/443 blocked                               |
| Spotify says "INVALID_CLIENT: Invalid redirect URI"       | `SPOTIFY_REDIRECT_URI` doesn't exactly match a redirect URI in the dashboard               |
| Login loops back to the login page                        | `APP_ORIGIN` isn't the `https://` origin, so the secure session cookie isn't kept          |
| "isn't on this app's invite list" after login             | the account isn't in User Management (Development Mode allowlist)                          |
| Deploy fails at "Pull and restart" with `.env is missing` | step 4 wasn't done on the server                                                           |
| `429 RATE_LIMITED` from the API                           | 300 req/min per IP on `/api/*`, 20/min on login — see `server/src/middleware/rateLimit.ts` |

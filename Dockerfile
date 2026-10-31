# syntax=docker/dockerfile:1.7
# Pulse Player — API + built client on one origin.
# Node 22 LTS: Node 20 reached end-of-life in April 2026 and the toolchain (Vitest 5) needs 22.12+.
ARG NODE_IMAGE=node:22-alpine

# ---- build: install everything, build client (-> server/public) and compile the server ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY fixtures fixtures
COPY client client
COPY server server
RUN npm run build

# ---- deps: production dependencies of the server workspace only ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace=server --include-workspace-root=false --no-audit --no-fund \
    && find node_modules -type d -empty -delete

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app
# Workspace layout is kept so hoisted node_modules resolve from /app/server.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/server/package.json ./server/package.json
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/server/public ./server/public
WORKDIR /app/server
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --start-interval=2s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
CMD ["node", "--enable-source-maps", "dist/index.js"]

# Production image: the server (Fastify + WebSocket) and the web app it serves, in one container.

# Every stage starts from the workspace manifests alone, so `npm ci` is cached until a dependency changes.
FROM node:22-alpine AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/

# Stage 1: build the web app and bundle the server (the shared core is inlined into it).
FROM manifests AS build
RUN npm ci
COPY tsconfig.base.json ./
COPY packages packages
COPY apps apps
RUN npm run build

# Stage 2: the server's runtime dependencies only (no dev tools, no web or Android toolchain).
FROM manifests AS runtime-deps
RUN npm ci --omit=dev --workspace @contorno/server

# Stage 3: what actually runs.
FROM node:22-alpine
ENV NODE_ENV=production PORT=8080 PUBLIC_DIR=/app/public
WORKDIR /app
COPY --from=runtime-deps /app/node_modules node_modules
COPY --from=build /app/apps/server/dist dist
COPY --from=build /app/apps/server/drizzle drizzle
COPY --from=build /app/apps/web/dist public
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz > /dev/null || exit 1
CMD ["node", "dist/index.js"]

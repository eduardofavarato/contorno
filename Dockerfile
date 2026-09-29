# Stage 1: compile the web app (src/ + shared/ + bundled d3/topojson) into a single index.html.
FROM node:22-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY build.js ./
COPY src src
COPY shared shared
RUN CONTORNO_BUILD_OUT=dist/index.html node build.js

# Stage 2: the server that serves that page and the online duel WebSocket.
FROM node:22-alpine
ENV NODE_ENV=production PORT=8080 PUBLIC_DIR=/app/public
WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN npm ci --omit=dev --prefix server
COPY server/src server/src
COPY shared shared
COPY --from=web /app/dist/index.html public/index.html
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz > /dev/null || exit 1
CMD ["node", "server/src/index.js"]

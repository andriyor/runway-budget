FROM node:26-slim AS build
RUN npm i -g pnpm@12.11.2
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY api/package.json api/
COPY web/package.json web/
COPY shared/package.json shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm --filter api deploy --prod --legacy /out/api

FROM node:26-slim
WORKDIR /app
COPY --from=build /out/api ./
COPY --from=build /app/api/dist ./dist
COPY --from=build /app/web/dist ./public
ENV NODE_ENV=production FASTIFY_ADDRESS=0.0.0.0 DB_FILE=/data/data.db WEB_DIR=/app/public
# V8 sizes the heap from host RAM (2.2 GB on an 8 GB Pi) and rarely collects; the app needs ~20 MB.
# Measured on the Pi: 155 MB -> ~125 MB RSS after the same requests; lower caps save nothing more,
# so 96 MB keeps headroom for growth at almost no cost.
ENV NODE_OPTIONS="--max-old-space-size=96 --max-semi-space-size=1"
VOLUME /data
EXPOSE 3000
CMD ["node_modules/.bin/fastify", "start", "-l", "info", "dist/app.js"]


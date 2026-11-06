FROM node:24-slim AS build
RUN npm i -g pnpm@12.11.2
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm --filter api deploy --prod --legacy /out/api

FROM node:24-slim AS api
WORKDIR /app
COPY --from=build /out/api ./
COPY --from=build /app/api/dist ./dist
ENV NODE_ENV=production FASTIFY_ADDRESS=0.0.0.0 DB_FILE=/data/data.db
VOLUME /data
EXPOSE 3000
CMD ["node_modules/.bin/fastify", "start", "-l", "info", "dist/app.js"]

FROM nginx:1.29-alpine AS web
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import AutoLoad from '@fastify/autoload'
import Static from '@fastify/static'
import { FastifyPluginAsync } from 'fastify'

const app: FastifyPluginAsync = async (fastify, opts) => {
  // local secrets such as MONO_TOKEN; absent in Docker, where env comes from compose
  try {
    process.loadEnvFile()
  } catch {}

  // shared plugins: the database, sensible errors, the Monobank schedule
  void fastify.register(AutoLoad, { dir: join(__dirname, 'plugins'), options: opts })

  // one plugin per folder in routes, under /api so the web app can be served from /
  void fastify.register(AutoLoad, { dir: join(__dirname, 'routes'), options: { ...opts, prefix: '/api' } })

  // the built web app, when there is one (Docker, or after `pnpm build`); `pnpm dev` serves it from Vite
  const webDir = process.env.WEB_DIR ?? join(__dirname, '..', '..', 'web', 'dist')
  if (existsSync(webDir)) void fastify.register(Static, { root: webDir })
}

export default app
export { app }

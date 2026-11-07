import { existsSync } from 'node:fs'
import { join } from 'node:path'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import Static from '@fastify/static'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {

}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // Place here your custom code!
  // local secrets such as MONO_TOKEN; absent in Docker, where env comes from compose
  try { process.loadEnvFile() } catch {}

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  // under /api, so the web app can be served from /
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: { ...opts, prefix: '/api' }
  })

  // the built web app, when there is one (Docker, or after `pnpm build`); `pnpm dev` serves it from Vite
  const webDir = process.env.WEB_DIR ?? join(__dirname, '..', '..', 'web', 'dist')
  if (existsSync(webDir)) void fastify.register(Static, { root: webDir })
}

export default app
export { app, options }

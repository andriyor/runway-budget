import { join } from 'node:path'
import fp from 'fastify-plugin'
import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export default fp(async (fastify) => {
  const sqlite = new Database(process.env.DB_FILE ?? 'data.db')
  const db = drizzle({ client: sqlite })
  // same relative path from src/plugins (ts-node) and dist/plugins (build)
  migrate(db, { migrationsFolder: join(__dirname, '..', '..', 'drizzle') })

  fastify.decorate('db', db)
  fastify.addHook('onClose', async () => { sqlite.close() })
})

declare module 'fastify' {
  export interface FastifyInstance {
    db: BetterSQLite3Database
  }
}

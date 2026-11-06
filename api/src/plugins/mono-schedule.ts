import fp from 'fastify-plugin'
import { syncMono } from '../mono'

// local times of day for the automatic Monobank sync; each sync re-reads 31 days, so a run
// missed while the server was down loses nothing
const SYNC_AT: ReadonlyArray<readonly [hour: number, minute: number]> = [[9, 0], [21, 0]]

// the first of today's or tomorrow's run times after `now`
export function nextRun (now: Date, at = SYNC_AT): Date {
  const runs = [0, 1].flatMap((day) =>
    at.map(([hour, minute]) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, minute)))
  return runs.filter((run) => run > now).sort((a, b) => a.getTime() - b.getTime())[0]
}

// Fixed times rather than "every 12 hours from start": dev restarts the server on every change,
// and Monobank allows one statement request per minute.
export default fp(async (fastify) => {
  if (!process.env.MONO_TOKEN || !process.env.MONO_ACCOUNT) return

  let timer: NodeJS.Timeout
  const schedule = () => {
    const at = nextRun(new Date())
    timer = setTimeout(async () => {
      try {
        const { fetched } = await syncMono(fastify, fastify.log)
        fastify.log.info({ fetched }, 'scheduled Monobank sync done')
      } catch (err) {
        fastify.log.warn({ err }, 'scheduled Monobank sync failed')
      }
      schedule()
    }, at.getTime() - Date.now())
    // a pending sync must not keep the process alive
    timer.unref()
    fastify.log.info({ at: at.toString() }, 'next Monobank sync')
  }
  schedule()
  fastify.addHook('onClose', async () => { clearTimeout(timer) })
})

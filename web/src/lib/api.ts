// the last response of every GET, so a page opened again renders at once and refreshes in the background
// instead of flashing empty; any write clears it, since one change can affect several responses
const responses = new Map<string, unknown>()

// the last response of a GET, or undefined before the first one (or after a write)
export const cached = <T>(path: string) => responses.get(path) as T | undefined

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText)
  const body: T = res.status === 204 ? (undefined as T) : await res.json()
  if (!init?.method || init.method === 'GET') responses.set(path, body)
  else responses.clear()
  return body
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText)
  return res.status === 204 ? (undefined as T) : res.json()
}

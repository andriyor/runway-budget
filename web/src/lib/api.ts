import { QueryClient, useQuery } from '@tanstack/react-query'

// Server data lives in TanStack Query, keyed by the API path: a page opened again renders the last
// response at once and refreshes it in the background, and pages share one copy of each response.
export const queryClient = new QueryClient()

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText)
  const body: T = res.status === 204 ? (undefined as T) : await res.json()
  // a write can change several responses (balances, transactions, stats), so all of them are refetched:
  // the ones on screen now, the rest when next shown; the write returns once the screen is up to date
  if (init?.method && init.method !== 'GET') await queryClient.invalidateQueries()
  return body
}

// GET a path; enabled: false waits, e.g. for a path that needs other data first
export const useApi = <T>(path: string, enabled = true) =>
  useQuery({ queryKey: [path], queryFn: () => api<T>(path), enabled })

// change a response in place, to show an edit before the refetch lands; does nothing before it loads
export function setCached<T>(path: string, next: T | ((old: T) => T)) {
  queryClient.setQueryData<T>([path], (old) =>
    typeof next !== 'function' ? next : old === undefined ? old : (next as (old: T) => T)(old))
}

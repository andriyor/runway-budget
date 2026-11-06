import { useEffect, useRef, useState } from 'react'
import { CategorySpending } from '../components/CategorySpending'
import { MerchantIcon } from '../components/MerchantIcon'
import { MerchantSpending } from '../components/MerchantSpending'
import { MonthlySpending } from '../components/MonthlySpending'
import { Skeleton } from '../components/controls'
import { api } from '../lib/api'
import { format } from '../lib/format'
import { periodsOf } from '../lib/periods'
import { linkButton, card, muted, inputBox, button } from '../lib/styles'
import type { Account, Transaction, Category, Leaf } from '../lib/types'

export function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState<number>()
  const [list, setList] = useState<Transaction[]>()
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [category, setCategory] = useState<string>()
  // merchant key from the API; cleared whenever the category, period or account changes
  const [merchant, setMerchant] = useState<string>()
  const pickCategory = (c?: string) => { setCategory(c); setMerchant(undefined) }
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  // the transaction just recategorized stays in the filtered view it was changed in,
  // so its "усім від продавця" link is still reachable; another filter drops it
  const [kept, setKept] = useState<{ id: number, view: string }>()
  // the note being edited; Enter or leaving the field saves, Escape cancels
  const [editing, setEditing] = useState<{ id: number, draft: string }>()
  const cancelled = useRef(false)
  const [period, setPeriod] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const account = accounts.find((a) => a.id === accountId)
  const leafById = new Map<string, Leaf>(categories.flatMap((c) =>
    c.subcategories.length ? c.subcategories.map((sc) => [sc.id, { ...sc, parent: c }] as const) : [[c.id, { id: c.id, label: c.label, parent: c }] as const]))
  // a selection is a category (matches all its subcategories) or a single subcategory
  const view = `${accountId}|${period}|${category}`
  const inSelection = (t: Transaction) =>
    t.category === category || leafById.get(t.category)?.parent.id === category || (kept?.id === t.id && kept.view === view)
  const selectionLabel = (id: string) => {
    const leaf = leafById.get(id)
    if (!leaf) return categories.find((c) => c.id === id)?.label
    return leaf.id === leaf.parent.id ? leaf.label : `${leaf.parent.label} › ${leaf.label}`
  }

  useEffect(() => {
    api<Account[]>('/accounts')
      .then((all) => {
        setAccounts(all)
        setAccountId((all.find((a) => a.monoAccountId) ?? all[0])?.id)
      })
      .catch((e) => setError(e.message))
    api<Category[]>('/categories').then(setCategories).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (accountId === undefined) return
    api<Transaction[]>(`/accounts/${accountId}/transactions`).then(setList).catch((e) => setError(e.message))
  }, [accountId])

  async function sync() {
    setSyncing(true)
    try {
      const { account: synced } = await api<{ account: Account }>('/accounts/mono/sync', { method: 'POST' })
      setAccounts((all) => (all.some((a) => a.id === synced.id) ? all.map((a) => (a.id === synced.id ? synced : a)) : [...all, synced]))
      setList(await api<Transaction[]>(`/accounts/${synced.id}/transactions`))
      setAccountId(synced.id)
      setError('')
    } catch (err) {
      setError(`Monobank: ${(err as Error).message}`)
    } finally {
      setSyncing(false)
    }
  }

  // A merchant change touches other rows, so reload the list after any change
  async function changeCategory(t: Transaction, steps: Array<{ path: string, body: object }>) {
    try {
      for (const { path, body } of steps) await api(path, { method: 'PUT', body: JSON.stringify(body) })
      setList(await api<Transaction[]>(`/accounts/${t.accountId}/transactions`))
    } catch (err) {
      setError(`Category: ${(err as Error).message}`)
    }
  }
  const setOwn = (t: Transaction, category: string | null) => ({ path: `/categories/transactions/${t.id}`, body: { category } })
  const setMerchantCategory = (t: Transaction, category: string | null) => ({ path: '/categories/merchants', body: { description: t.description, category } })

  async function saveNote(t: Transaction, draft: string) {
    setEditing(undefined)
    if (draft.trim() === (t.note ?? '')) return
    try {
      const { note } = await api<{ note: string | null }>(`/transactions/${t.id}`, { method: 'PATCH', body: JSON.stringify({ note: draft }) })
      setList((all) => all?.map((x) => (x.id === t.id ? { ...x, note } : x)))
    } catch (err) {
      setError(`Note: ${(err as Error).message}`)
    }
  }

  const dateTime = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })

  const periods = new Map<string, string>()
  for (const t of list ?? []) for (const [key, label] of periodsOf(t)) periods.set(key, label)
  // keys sort chronologically as text; newest first
  const periodOptions = (prefix: string) => [...periods].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => b.localeCompare(a))
  const shown = period ? list?.filter((t) => periodsOf(t).some(([key]) => key === period)) : list
  const inCategory = category ? shown?.filter(inSelection) : shown
  const listed = merchant ? inCategory?.filter((t) => t.merchant === merchant) : inCategory
  const merchantName = merchant && list?.find((t) => t.merchant === merchant && t.amount < 0)?.description

  return (
    <>
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">
          {error}
        </p>
      )}
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Account"
            value={accountId ?? ''}
            onChange={(e) => { setList(undefined); pickCategory(undefined); setPeriod(''); setAccountId(Number(e.target.value)) }}
            className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${inputBox}`}
          >
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
          </select>
          <select
            aria-label="Period"
            value={period}
            onChange={(e) => { pickCategory(undefined); setPeriod(e.target.value) }}
            className={`min-w-40 px-3 py-2 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${inputBox}`}
          >
            <option value="">Увесь час</option>
            <optgroup label="Місяць">
              {periodOptions('m:').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </optgroup>
            <optgroup label="Тиждень">
              {periodOptions('w:').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </optgroup>
          </select>
          {account && (
            <span className="text-lg font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{format(account.balance, account.currency)}</span>
          )}
          <button className={button} onClick={sync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync Monobank'}</button>
        </div>

        {accounts.length === 0 && <p className={`py-6 text-center ${muted}`}>No accounts yet. Sync Monobank to create one.</p>}
        {account && !list && <div className="mt-4"><Skeleton /></div>}
        {account && list?.length === 0 && <p className={`py-6 text-center ${muted}`}>No transactions for this account.</p>}
      </section>
      {account && shown && list!.length > 0 && (
        <>
          <MonthlySpending list={list!} currency={account.currency} leafById={leafById} period={period} onPick={(p, c) => { setPeriod(p); pickCategory(c) }} />
          <CategorySpending list={shown} currency={account.currency} leafById={leafById} selected={category} onSelect={pickCategory} />
          <MerchantSpending list={inCategory!} currency={account.currency} leafById={leafById} selected={merchant} onSelect={setMerchant} />
          <section className={card}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-3">
                <span className="truncate text-zinc-700 dark:text-zinc-300">
                  {[category && selectionLabel(category), merchant && merchantName].filter(Boolean).join(' · ') || 'All transactions'}
                </span>
                {(category || merchant) && (
                  <button type="button" onClick={() => pickCategory(undefined)} className="shrink-0 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    Show all
                  </button>
                )}
              </span>
              <div role="group" aria-label="Sort by" className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
                {(['date', 'amount'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={sortBy === key}
                    onClick={() => setSortBy(key)}
                    className={`rounded-md px-2.5 py-1 font-medium ${
                      sortBy === key
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {key === 'date' ? 'Date' : 'Amount'}
                  </button>
                ))}
              </div>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {/* the API returns newest first; amount sorts biggest first, income and spending alike */}
              {listed!
                .toSorted((a, b) => (sortBy === 'amount' ? Math.abs(b.amount) - Math.abs(a.amount) : 0))
                .map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <MerchantIcon domain={t.merchantDomain} emoji={leafById.get(t.category)?.parent.emoji ?? ''} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.description}</p>
                    {editing?.id === t.id ? (
                      <input
                        autoFocus
                        maxLength={1000}
                        aria-label={`Note for ${t.description}`}
                        placeholder="Нотатка"
                        value={editing.draft}
                        onChange={(e) => setEditing({ id: t.id, draft: e.target.value })}
                        onBlur={() => (cancelled.current ? setEditing(undefined) : saveNote(t, editing.draft))}
                        onFocus={() => { cancelled.current = false }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelled.current = true
                          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
                        }}
                        className={`my-0.5 w-full px-2 py-1 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${inputBox}`}
                      />
                    ) : t.note && (
                      <button
                        type="button"
                        onClick={() => setEditing({ id: t.id, draft: t.note ?? '' })}
                        title="Змінити нотатку"
                        className="block max-w-full truncate text-left text-sm text-zinc-600 italic hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        {t.note}
                      </button>
                    )}
                    <p className={`flex min-w-0 items-center gap-1 tabular-nums ${muted}`}>
                      <select
                        aria-label={`Category of ${t.description}`}
                        value={t.category}
                        title={selectionLabel(t.category)}
                        onChange={(e) => {
                          setKept({ id: t.id, view })
                          changeCategory(t, [setOwn(t, e.target.value || null)])
                        }}
                        className="max-w-40 shrink-0 cursor-pointer truncate rounded bg-transparent hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100"
                      >
                        <option value="">Автоматично</option>
                        {categories.filter((c) => c.subcategories.length).map((c) => (
                          <optgroup key={c.id} label={`${c.emoji} ${c.label}`}>
                            {c.subcategories.map((sc) => <option key={sc.id} value={sc.id}>{sc.label}</option>)}
                          </optgroup>
                        ))}
                        <optgroup label="Службові">
                          {categories.filter((c) => !c.subcategories.length).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </optgroup>
                      </select>
                      {t.categorySource === 'transaction' && (
                        <button type="button" className={linkButton} onClick={() => changeCategory(t, [setMerchantCategory(t, t.category), setOwn(t, null)])}>
                          усім від продавця
                        </button>
                      )}
                      {t.categorySource === 'merchant' && (
                        <button type="button" className={linkButton} onClick={() => changeCategory(t, [setMerchantCategory(t, null)])}>
                          скинути для продавця
                        </button>
                      )}
                      {!t.note && editing?.id !== t.id && (
                        <button type="button" className={linkButton} onClick={() => setEditing({ id: t.id, draft: '' })}>
                          + нотатка
                        </button>
                      )}
                      <span className="truncate" title={t.mccDescription ?? undefined}>· {dateTime.format(new Date(t.time))} · MCC {t.mcc}</span>
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${t.amount < 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {format(t.amount, account.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  )
}

import { useRef, useState } from 'react'
import { CategoryPicker } from './CategoryPicker'
import { BalanceHistory } from '../balances/BalanceHistory'
import { CategorySpending } from './CategorySpending'
import { MerchantIcon } from '../../components/MerchantIcon'
import { RefreshCw } from 'lucide-react'
import { MerchantSpending } from './MerchantSpending'
import { MonthlySpending } from './MonthlySpending'
import { PeriodPicker } from './PeriodPicker'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Skeleton } from '../../components/Skeleton'
import { api, useApi } from '../../lib/api'
import { budgetWith } from '../../lib/budget'
import { format } from '../../lib/format'
import { inPeriod, monthKey, periodsOf, rangeLabel, rangeOf } from '../../lib/periods'
import { linkButton, card, muted, inputBox, button } from '../../lib/styles'
import type { Account, Budget, Transaction, Category, Leaf } from '../../lib/types'

const PAGE = 100
const dateTime = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })

// opens a dropdown that was just put in place of its button; the click still counts as user activation
const openPicker = (el: HTMLSelectElement | null) => {
  if (!el || el.dataset.opened) return
  el.dataset.opened = '1'
  el.focus()
  try {
    el.showPicker()
  } catch {
    /* unsupported: focused, opens on the next click or key */
  }
}

// the account picker leaves out accounts without transactions, unless none has any, so the page still shows one
const withTransactions = (list: Account[]) =>
  list.some((a) => a.transactionCount > 0) ? list.filter((a) => a.transactionCount > 0) : list

const linkParams = () => new URLSearchParams(location.hash.split('?')[1])

// the account to open: one linked from the Balances list, else the synced one, else the first
function openingAccount(all: Account[], linked: URLSearchParams) {
  const offered = withTransactions(all)
  const linkedId = Number(linked.get('account'))
  return (offered.find((a) => a.id === linkedId) ?? offered.find((a) => a.monoAccountId) ?? offered[0])?.id
}

// the period to open: a linked one (all time when the link names only a category), else the latest month
// with data; the chart around it still shows its year (half a year on phones)
const openingPeriod = (list: Transaction[], linked: URLSearchParams) =>
  linked.has('period') || linked.has('category')
    ? (linked.get('period') ?? '')
    : list.length
      ? `m:${monthKey(list[0].time)}`
      : ''

export function TransactionsPage() {
  // filters from a link, e.g. #/transactions?account=3&category=food&period=m:2026-11 (or r:2026-03-03..2026-04-15); dropped on picking another account
  const [link, setLink] = useState(linkParams)
  const accountsQuery = useApi<Account[]>('/accounts')
  const categoriesQuery = useApi<Category[]>('/categories')
  const accounts = accountsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  // the opening account until one is picked
  const [pickedAccount, setAccountId] = useState<number>()
  const accountId = pickedAccount ?? (accountsQuery.data && openingAccount(accountsQuery.data, link))
  const listQuery = useApi<Transaction[]>(`/accounts/${accountId}/transactions`, accountId !== undefined)
  const list = listQuery.data
  // a failed save, else a failed load
  const [saveError, setError] = useState('')
  const error = saveError || (accountsQuery.error ?? categoriesQuery.error ?? listQuery.error)?.message || ''
  const [syncing, setSyncing] = useState(false)
  const [category, setCategory] = useState(() => link.get('category') ?? undefined)
  // merchant key from the API; cleared whenever the category, period or account changes
  const [merchant, setMerchant] = useState<string>()
  const pickCategory = (c?: string) => {
    setCategory(c)
    setMerchant(undefined)
  }
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  // the transaction just recategorized stays in the filtered view it was changed in,
  // so its "усім від продавця" link is still reachable; another filter drops it
  const [kept, setKept] = useState<{ id: number; view: string }>()
  // the note being edited; Enter or leaving the field saves, Escape cancels
  const [editing, setEditing] = useState<{ id: number; draft: string }>()
  const cancelled = useRef(false)
  // the one row whose essential dropdown is open; other rows show a plain button,
  // since a dropdown per row meant ~100k <option>s for a year of transactions
  const [picking, setPicking] = useState<number>()
  // rows rendered; the summaries above always use every transaction
  const [limit, setLimit] = useState(PAGE)
  // the opening period until one is picked
  const [pickedPeriod, setPeriod] = useState<string>()
  const period = pickedPeriod ?? (list ? openingPeriod(list, link) : '')
  // only spending needed to live: the chart's median becomes the minimal month
  const [essentialOnly, setEssentialOnly] = useState(false)
  const [notice, setNotice] = useState('')
  const account = accounts.find((a) => a.id === accountId)
  const offered = withTransactions(accounts)
  const leafById = new Map<string, Leaf>(
    categories.flatMap((c) =>
      c.subcategories.length
        ? c.subcategories.map((sc) => [sc.id, { ...sc, parent: c }] as const)
        : [[c.id, { id: c.id, label: c.label, parent: c }] as const],
    ),
  )
  // a selection is a category (matches all its subcategories) or a single subcategory
  const view = `${accountId}|${period}|${category}|${essentialOnly}`
  const isKept = (t: Transaction) => kept?.id === t.id && kept.view === view
  const inSelection = (t: Transaction) =>
    t.category === category || leafById.get(t.category)?.parent.id === category || isKept(t)
  const selectionLabel = (id: string) => {
    const leaf = leafById.get(id)
    if (!leaf) return categories.find((c) => c.id === id)?.label
    return leaf.id === leaf.parent.id ? leaf.label : `${leaf.parent.label} › ${leaf.label}`
  }

  async function sync() {
    setSyncing(true)
    try {
      const { account: synced } = await api<{ account: Account }>('/accounts/mono/sync', { method: 'POST' })
      // the sync has refetched the accounts and their transactions (see api)
      setAccountId(synced.id)
      setError('')
    } catch (err) {
      setError(`Monobank: ${(err as Error).message}`)
    } finally {
      setSyncing(false)
    }
  }

  // a merchant change touches other rows; each write refetches the list (see api)
  async function changeCategory(steps: Array<{ path: string; body: object }>) {
    try {
      for (const { path, body } of steps) await api(path, { method: 'PUT', body: JSON.stringify(body) })
    } catch (err) {
      setError(`Category: ${(err as Error).message}`)
    }
  }
  const setOwn = (t: Transaction, category: string | null) => ({
    path: `/categories/transactions/${t.id}`,
    body: { category },
  })
  const setMerchantCategory = (t: Transaction, category: string | null) => ({
    path: '/categories/merchants',
    body: { description: t.description, category },
  })

  // choice is "t:true", "t:false" or "t:" (reset) for this transaction, "m:…" for its merchant
  async function changeEssential(t: Transaction, choice: string) {
    const [scope, value] = choice.split(':')
    const essential = value === '' ? null : value === 'true'
    setKept({ id: t.id, view })
    try {
      await (scope === 't'
        ? api(`/transactions/${t.id}`, { method: 'PATCH', body: JSON.stringify({ essential }) })
        : api('/categories/merchants/essential', {
            method: 'PUT',
            body: JSON.stringify({ description: t.description, essential }),
          }))
    } catch (err) {
      setError(`Essential: ${(err as Error).message}`)
    }
  }

  // writes the chart's median into Runway (see budgetWith), keeping the rest of the budget
  async function useMedian(value: number) {
    const amount = Math.round(value)
    const currency = account!.currency
    try {
      const body = budgetWith(
        await api<Budget | null>('/budget'),
        essentialOnly ? 'minimalSpend' : 'monthlySpend',
        amount,
        currency,
      )
      if (!body) return setError('Set "I spend per month" in Runway first')
      await api('/budget', { method: 'PUT', body: JSON.stringify(body) })
      setNotice(
        `Runway: ${essentialOnly ? 'essential spending' : 'monthly spending'} set to ${format(amount, currency)} per month`,
      )
    } catch (err) {
      setError(`Runway: ${(err as Error).message}`)
    }
  }

  async function saveNote(t: Transaction, draft: string) {
    setEditing(undefined)
    if (draft.trim() === (t.note ?? '')) return
    try {
      await api(`/transactions/${t.id}`, { method: 'PATCH', body: JSON.stringify({ note: draft }) })
    } catch (err) {
      setError(`Note: ${(err as Error).message}`)
    }
  }

  const rowPicker =
    'shrink-0 cursor-pointer truncate rounded hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100'
  const essentialLabel = (t: Transaction) =>
    `${t.essential ? '● необхідне' : '○ необов’язкове'}${t.essentialSource !== 'auto' ? ' *' : ''}`
  const essentialOptions = (
    <>
      <optgroup label="Лише ця транзакція">
        <option value="t:true">Необхідне</option>
        <option value="t:false">Необов’язкове</option>
        <option value="t:">Як у продавця / категорії</option>
      </optgroup>
      <optgroup label="Усі від продавця">
        <option value="m:true">Необхідне</option>
        <option value="m:false">Необов’язкове</option>
        <option value="m:">Як у категорії</option>
      </optgroup>
    </>
  )

  const periods = new Map<string, string>()
  for (const t of list ?? []) for (const [key, label] of periodsOf(t)) periods.set(key, label)
  // a range picked on Balance over time
  if (rangeOf(period)) periods.set(period, rangeLabel(period))
  const base = essentialOnly ? list?.filter((t) => t.essential || isKept(t)) : list
  const shown = period ? base?.filter((t) => inPeriod(t, period)) : base
  const inCategory = category ? shown?.filter(inSelection) : shown
  const listed = merchant ? inCategory?.filter((t) => t.merchant === merchant) : inCategory
  const merchantName = merchant && list?.find((t) => t.merchant === merchant && t.amount < 0)?.description
  const chip =
    'inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900 dark:hover:bg-indigo-950'
  // the charts and summaries skip cancelled purchases and their cancellations; the list still shows them
  const counted = (l: Transaction[]) => l.filter((t) => !t.cancelled)
  const sorted = (listed ?? []).toSorted((a, b) => (sortBy === 'amount' ? Math.abs(b.amount) - Math.abs(a.amount) : 0))

  return (
    <>
      {notice && (
        <p
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
        >
          {notice}
          <button type="button" onClick={() => setNotice('')} className="shrink-0 font-medium hover:underline">
            OK
          </button>
        </p>
      )}
      <ErrorBanner>{error}</ErrorBanner>
      {/* desktop: stays at the top while the charts and the list scroll under it */}
      <section className={`${card} flex flex-col gap-3 lg:sticky lg:top-4 lg:z-20 lg:shadow-md`}>
        {/* the account: which one, its balance, syncing it */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Account"
            value={accountId ?? ''}
            onChange={(e) => {
              pickCategory(undefined)
              setPeriod(undefined)
              setLink(new URLSearchParams())
              setAccountId(Number(e.target.value))
              // keep the link in step so a reload stays on this account; replaceState fires no hashchange
              history.replaceState(null, '', `#/transactions?account=${e.target.value}`)
            }}
            className={`min-w-40 flex-1 px-3 py-2 text-sm font-medium text-zinc-900 outline-none sm:max-w-xs dark:text-zinc-100 ${inputBox}`}
          >
            {offered.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-3">
            {account && (
              <p className="flex flex-col text-right leading-tight">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Balance</span>
                <span className="text-lg font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                  {format(account.balance, account.currency)}
                </span>
              </p>
            )}
            {/* icon only on phones, the name stays for screen readers and as a tooltip */}
            <button
              className={`${button} flex items-center gap-2 max-sm:px-3`}
              onClick={sync}
              disabled={syncing}
              title="Sync Monobank"
            >
              <RefreshCw strokeWidth={2} className={syncing ? 'motion-safe:animate-spin' : undefined} />
              <span className="max-sm:sr-only">{syncing ? 'Syncing…' : 'Sync Monobank'}</span>
            </button>
          </div>
        </div>

        {/* what is shown: the period and which spending */}
        {account && list && list.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <PeriodPicker
              period={period}
              periods={periods}
              reference={shown?.[0]}
              onChange={(p) => {
                pickCategory(undefined)
                setPeriod(p)
              }}
            />
            <div
              role="group"
              aria-label="Spending shown"
              className="inline-flex shrink-0 rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800"
            >
              {([false, true] as const).map((only) => (
                <button
                  key={String(only)}
                  type="button"
                  aria-pressed={essentialOnly === only}
                  onClick={() => setEssentialOnly(only)}
                  className={`rounded-md px-2.5 py-1.5 font-medium ${
                    essentialOnly === only
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {only ? (
                    'Необхідні'
                  ) : (
                    <>
                      Усі<span className="max-sm:sr-only"> витрати</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* the category and merchant picked in the charts, each removable */}
        {(category || merchant) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={muted}>Filtered by</span>
            {category && (
              <button
                type="button"
                onClick={() => setCategory(undefined)}
                aria-label={`Remove filter ${selectionLabel(category)}`}
                className={chip}
              >
                {leafById.get(category)?.parent.emoji ?? categories.find((c) => c.id === category)?.emoji}{' '}
                {selectionLabel(category)} <span aria-hidden>×</span>
              </button>
            )}
            {merchant && (
              <button
                type="button"
                onClick={() => setMerchant(undefined)}
                aria-label={`Remove filter ${merchantName || merchant}`}
                className={chip}
              >
                {merchantName || merchant} <span aria-hidden>×</span>
              </button>
            )}
            {/* clears the merchant too */}
            <button type="button" onClick={() => pickCategory(undefined)} className={`${linkButton} text-sm`}>
              Clear all
            </button>
          </div>
        )}

        {accounts.length === 0 && (
          <p className={`py-6 text-center ${muted}`}>No accounts yet. Sync Monobank to create one.</p>
        )}
        {account && !list && (
          <div className="mt-4">
            <Skeleton />
          </div>
        )}
        {account && list?.length === 0 && (
          <p className={`py-6 text-center ${muted}`}>No transactions for this account.</p>
        )}
      </section>
      {account && shown && list!.length > 0 && (
        <>
          {/* one account in its own currency, so no conversion; dragging or clicking picks the period */}
          <BalanceHistory
            accounts={[account]}
            transactions={list}
            convertOn={(amount) => amount}
            currency={account.currency}
            period={period}
            onPick={(p) => {
              pickCategory(undefined)
              setPeriod(p)
            }}
          />
          <MonthlySpending
            list={counted(base!)}
            essentialOnly={essentialOnly}
            onUseMedian={!category && !merchant ? useMedian : undefined}
            currency={account.currency}
            leafById={leafById}
            period={period}
            onPick={setPeriod}
            selected={category}
            onSelect={pickCategory}
            merchant={merchant ? { key: merchant, name: merchantName || merchant } : undefined}
            onClearMerchant={() => setMerchant(undefined)}
          />
          <CategorySpending
            list={counted(shown)}
            currency={account.currency}
            leafById={leafById}
            selected={category}
            onSelect={pickCategory}
          />
          <MerchantSpending
            list={counted(inCategory!)}
            currency={account.currency}
            leafById={leafById}
            selected={merchant}
            onSelect={setMerchant}
          />
          <section className={card}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-3">
                <span className="truncate text-zinc-700 dark:text-zinc-300">
                  {[category && selectionLabel(category), merchant && merchantName].filter(Boolean).join(' · ') ||
                    'All transactions'}
                </span>
                {(category || merchant) && (
                  <button
                    type="button"
                    onClick={() => pickCategory(undefined)}
                    className="shrink-0 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Show all
                  </button>
                )}
              </span>
              <span className="flex items-center gap-3">
                <a href="#/rules" className={linkButton}>
                  Rules
                </a>
                <div
                  role="group"
                  aria-label="Sort by"
                  className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800"
                >
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
              </span>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {/* the API returns newest first; amount sorts biggest first, income and spending alike */}
              {sorted.slice(0, limit).map((t) => (
                <li key={t.id} className={`flex items-center gap-3 py-3 ${t.cancelled ? 'opacity-60' : ''}`}>
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
                        onFocus={() => {
                          cancelled.current = false
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelled.current = true
                          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
                        }}
                        className={`my-0.5 w-full px-2 py-1 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${inputBox}`}
                      />
                    ) : (
                      t.note && (
                        <button
                          type="button"
                          onClick={() => setEditing({ id: t.id, draft: t.note ?? '' })}
                          title="Змінити нотатку"
                          className="block max-w-full truncate text-left text-sm text-zinc-600 italic hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          {t.note}
                        </button>
                      )
                    )}
                    <p className={`flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 tabular-nums ${muted}`}>
                      {/* one chip: the name shows that category's statistics, as in "Spending by category"; ▾ changes it */}
                      <span className="inline-flex min-w-0 max-w-56 shrink-0 items-stretch divide-x divide-zinc-200 overflow-hidden rounded-full bg-zinc-100 text-xs text-zinc-700 dark:divide-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        <button
                          type="button"
                          title={`Статистика: ${selectionLabel(t.category)}`}
                          onClick={() => {
                            pickCategory(t.category)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="min-w-0 cursor-pointer truncate py-0.5 pr-2 pl-2.5 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300"
                        >
                          {leafById.get(t.category)?.label ?? t.category}
                        </button>
                        <CategoryPicker
                          label={`Category of ${t.description}: ${selectionLabel(t.category)}`}
                          value={t.categorySource === 'auto' ? '' : t.category}
                          categories={categories}
                          onPick={(category, forMerchant) => {
                            setKept({ id: t.id, view })
                            changeCategory(
                              forMerchant ? [setMerchantCategory(t, category), setOwn(t, null)] : [setOwn(t, category)],
                            )
                          }}
                        />
                      </span>
                      {picking === t.id ? (
                        <select
                          ref={openPicker}
                          aria-label={`Essential: ${t.description}`}
                          value=""
                          onBlur={() => setPicking(undefined)}
                          onChange={(e) => {
                            setPicking(undefined)
                            changeEssential(t, e.target.value)
                          }}
                          className="field-sizing-content max-w-40 shrink-0 cursor-pointer truncate rounded bg-transparent focus-visible:outline-2 focus-visible:outline-indigo-500"
                        >
                          <option value="" disabled hidden>
                            {essentialLabel(t)}
                          </option>
                          {essentialOptions}
                        </select>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Essential: ${t.description}: ${essentialLabel(t)}`}
                          onClick={() => setPicking(t.id)}
                          className={`${rowPicker} ${t.essential ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
                        >
                          {essentialLabel(t)} <span aria-hidden>▾</span>
                        </button>
                      )}
                      {t.categorySource === 'transaction' && (
                        <button
                          type="button"
                          className={linkButton}
                          onClick={() => changeCategory([setMerchantCategory(t, t.category), setOwn(t, null)])}
                        >
                          усім від продавця
                        </button>
                      )}
                      {t.categorySource === 'merchant' && (
                        <button
                          type="button"
                          className={linkButton}
                          onClick={() => changeCategory([setMerchantCategory(t, null)])}
                        >
                          скинути для продавця
                        </button>
                      )}
                      {!t.note && editing?.id !== t.id && (
                        <button
                          type="button"
                          className={linkButton}
                          onClick={() => setEditing({ id: t.id, draft: '' })}
                        >
                          + нотатка
                        </button>
                      )}
                      {t.cancelled && <span className="font-medium">· скасовано, не враховано</span>}
                      <span className="truncate" title={t.mccDescription ?? undefined}>
                        · {dateTime.format(new Date(t.time))} · MCC {t.mcc}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${t.cancelled ? 'line-through' : ''} ${t.amount < 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-emerald-700 dark:text-emerald-400'}`}
                  >
                    {format(t.amount, account.currency)}
                  </span>
                </li>
              ))}
            </ul>
            {sorted.length > limit && (
              <button type="button" onClick={() => setLimit(limit + PAGE)} className={`mt-3 text-sm ${linkButton}`}>
                Показати ще {Math.min(PAGE, sorted.length - limit)} (показано {limit} з {sorted.length})
              </button>
            )}
          </section>
        </>
      )}
    </>
  )
}

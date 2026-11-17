import { useState, type FormEvent } from 'react'
import { KindToggle, ErrorText, MoneyInput } from '../../components/controls'
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { CurrencyIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { button, inputBox } from '../../lib/styles'
import { format, symbols } from '../../lib/format'
import { kindLabels } from '../../lib/display'
import type { Account } from '../../lib/types'

type AccountRowProps = {
  account: Account
  onSaved: (a: Account) => void
  onDeleted: (id: number) => void
  // undefined disables the button (first / last row)
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const stepButton = 'w-9 text-lg leading-none text-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400'
const moveButton ='rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:invisible dark:hover:bg-zinc-800 dark:hover:text-zinc-200'

export function AccountRow({ account, onSaved, onDeleted, onMoveUp, onMoveDown }: AccountRowProps) {
  const [name, setName] = useState(account.name)
  const [balance, setBalance] = useState(String(account.balance))
  const [currency, setCurrency] = useState(account.currency)
  const [kind, setKind] = useState(account.kind)
  const [error, setError] = useState('')
  const transactionsHref = `#/transactions?account=${account.id}`
  const dirty = name.trim() !== account.name
    || Number(balance) !== account.balance
    || currency !== account.currency
    || kind !== account.kind

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      onSaved(await api<Account>(`/accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), balance: Number(balance), currency, kind }),
      }))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const [delta, setDelta] = useState('')
  const [busy, setBusy] = useState(false)
  // view shows the balance; edit swaps in the fields; adjust swaps in a −/+ amount stepper.
  // A save re-keys the row on updatedAt, so it remounts in view.
  const [mode, setMode] = useState<'view' | 'edit' | 'adjust'>('view')
  // back to view, dropping unsaved edits
  function close() {
    setMode('view')
    setDelta('')
    setName(account.name)
    setBalance(String(account.balance))
    setCurrency(account.currency)
    setKind(account.kind)
    setError('')
  }

  // sign: 1 adds, -1 subtracts; the list re-keys the row on updatedAt, so it remounts with the new balance
  async function adjust(sign: 1 | -1) {
    setBusy(true)
    try {
      onSaved(await api<Account>(`/accounts/${account.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ amount: sign * Number(delta) }),
      }))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const canAdjust = Number(delta) > 0

  async function remove() {
    if (!confirm(`Delete account "${account.name}"? Its balance will no longer be counted.`)) return
    try {
      await api(`/accounts/${account.id}`, { method: 'DELETE' })
      onDeleted(account.id)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const iconButton = 'rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'

  return (
    <li className="py-3">
      <form className="flex flex-wrap items-center gap-x-3 gap-y-2" onSubmit={save}>
        <div className="-ml-2 flex flex-col">
          <button type="button" onClick={onMoveUp} disabled={!onMoveUp} aria-label={`Move ${account.name} up`} className={moveButton}>
            <ChevronUp strokeWidth={2} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={!onMoveDown} aria-label={`Move ${account.name} down`} className={moveButton}>
            <ChevronDown strokeWidth={2} />
          </button>
        </div>
        {/* links to the account's transactions only when it has any */}
        {account.transactionCount > 0
          ? (
            <a href={transactionsHref} aria-label={`${account.name} transactions`} title="Show transactions" className="rounded-full hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 dark:hover:ring-offset-zinc-900">
              <CurrencyIcon currency={account.currency} className="size-9 text-sm" />
            </a>
            )
          : <CurrencyIcon currency={account.currency} className="size-9 text-sm" />}
        <div className="min-w-32 flex-1">
          {mode === 'edit'
            ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                pattern=".*\S.*"
                autoFocus
                aria-label="Account name"
                className={`w-full px-2 py-1 font-medium text-zinc-900 outline-none dark:text-zinc-100 ${inputBox}`}
              />
              )
            : <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{account.name}</p>}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {kindLabels[account.kind]} · updated {new Date(account.updatedAt).toLocaleString('uk-UA')}
            {account.transactionCount > 0 && (
              <>
                {' · '}
                <a href={transactionsHref} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">Transactions →</a>
              </>
            )}
          </p>
        </div>

        {mode === 'view' && (
          <div className="flex items-center gap-1">
            <span className="mr-2 font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{format(account.balance, account.currency)}</span>
            {/* synced accounts take their balance from the bank */}
            {!account.monoAccountId && (
              <button type="button" onClick={() => setMode('adjust')} aria-label={`Add to or subtract from ${account.name}`} title="Add or subtract an amount" className={`${iconButton} size-9 p-0 text-lg leading-none`}>
                ±
              </button>
            )}
            <button type="button" onClick={() => setMode('edit')} aria-label={`Edit account ${account.name}`} className={iconButton}>
              <Pencil />
            </button>
            <button type="button" onClick={remove} aria-label={`Delete account ${account.name}`} className={`${iconButton} hover:text-rose-600`}>
              <Trash2 />
            </button>
          </div>
        )}

        {mode === 'adjust' && (
          <div className="flex w-full items-center gap-2 @2xl:w-64">
            <div className={`flex h-9 min-w-0 flex-1 items-stretch ${inputBox}`}>
              <button type="button" disabled={!canAdjust || busy} onClick={() => adjust(-1)} aria-label={`Subtract from ${account.name}`} className={`rounded-l-lg border-r border-zinc-200 dark:border-zinc-700 ${stepButton} hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950`}>
                −
              </button>
              <input
                type="number"
                step="0.01"
                min="0.01"
                autoFocus
                placeholder={`Amount, ${symbols[account.currency]}`}
                aria-label={`Amount to add to or subtract from ${account.name}`}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                // Enter would submit the row's form
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); if (e.key === 'Escape') close() }}
                className="w-full min-w-0 flex-1 bg-transparent px-3 text-center text-sm text-zinc-900 tabular-nums outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
              <button type="button" disabled={!canAdjust || busy} onClick={() => adjust(1)} aria-label={`Add to ${account.name}`} className={`rounded-r-lg border-l border-zinc-200 dark:border-zinc-700 ${stepButton} hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950`}>
                +
              </button>
            </div>
            <button type="button" onClick={close} aria-label="Cancel" className={`${iconButton} size-9 p-0 text-lg leading-none`}>×</button>
          </div>
        )}

        {mode === 'edit' && (
          <div className="flex w-full items-center gap-2 @2xl:w-auto @2xl:gap-3">
            <KindToggle value={kind} onChange={setKind} />
            <div className="min-w-0 flex-1 @2xl:w-56 @2xl:flex-none">
              <MoneyInput label={`${account.name} balance`} required value={balance} onChange={setBalance} currency={currency} onCurrency={setCurrency} />
            </div>
            <button className={button} disabled={!dirty}>Save</button>
            <button type="button" onClick={close} className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700">
              Cancel
            </button>
          </div>
        )}
      </form>
      {mode === 'adjust' && canAdjust && (
        <p className="mt-1 text-right text-xs text-zinc-500 tabular-nums dark:text-zinc-400" aria-live="polite">
          − <span className="text-rose-600 dark:text-rose-400">{format(account.balance - Number(delta), account.currency)}</span>
          {' · '}
          + <span className="text-emerald-600 dark:text-emerald-400">{format(account.balance + Number(delta), account.currency)}</span>
        </p>
      )}
      <ErrorText>{error}</ErrorText>
    </li>
  )
}

import { useState, type FormEvent } from 'react'
import { KindToggle, ErrorText, MoneyInput } from './controls'
import { CurrencyIcon, ChevronIcon, TrashIcon } from './icons'
import { api } from '../lib/api'
import { button } from '../lib/styles'
import type { Account } from '../lib/types'

type AccountRowProps = {
  account: Account
  onSaved: (a: Account) => void
  onDeleted: (id: number) => void
  // undefined disables the button (first / last row)
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const moveButton = 'rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:invisible dark:hover:bg-zinc-800 dark:hover:text-zinc-200'

export function AccountRow({ account, onSaved, onDeleted, onMoveUp, onMoveDown }: AccountRowProps) {
  const [name, setName] = useState(account.name)
  const [balance, setBalance] = useState(String(account.balance))
  const [currency, setCurrency] = useState(account.currency)
  const [kind, setKind] = useState(account.kind)
  const [error, setError] = useState('')
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

  async function remove() {
    if (!confirm(`Delete account "${account.name}"? Its balance will no longer be counted.`)) return
    try {
      await api(`/accounts/${account.id}`, { method: 'DELETE' })
      onDeleted(account.id)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <li className="py-3">
      <form className="flex flex-wrap items-center gap-x-3 gap-y-2" onSubmit={save}>
        <div className="-ml-2 flex flex-col">
          <button type="button" onClick={onMoveUp} disabled={!onMoveUp} aria-label={`Move ${account.name} up`} className={moveButton}>
            <ChevronIcon up />
          </button>
          <button type="button" onClick={onMoveDown} disabled={!onMoveDown} aria-label={`Move ${account.name} down`} className={moveButton}>
            <ChevronIcon />
          </button>
        </div>
        <CurrencyIcon currency={account.currency} className="size-9 text-sm" />
        <div className="min-w-32 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            pattern=".*\S.*"
            aria-label="Account name"
            title="Click to rename"
            className="-mx-1.5 w-full rounded-md bg-transparent px-1.5 py-0.5 font-medium text-zinc-900 outline-none hover:bg-zinc-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-950"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            updated {new Date(account.updatedAt).toLocaleString('uk-UA')}
          </p>
        </div>
        {/* phones: delete sits on the name line and the controls take a full second line;
            from sm up everything is one row with delete last */}
        <button
          type="button"
          onClick={remove}
          aria-label={`Delete account ${account.name}`}
          className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 sm:order-last dark:hover:bg-zinc-800"
        >
          <TrashIcon />
        </button>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <KindToggle value={kind} onChange={setKind} />
          <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
            <MoneyInput label={`${account.name} balance`} required value={balance} onChange={setBalance} currency={currency} onCurrency={setCurrency} />
          </div>
          <button className={button} disabled={!dirty}>Save</button>
        </div>
      </form>
      <ErrorText>{error}</ErrorText>
    </li>
  )
}

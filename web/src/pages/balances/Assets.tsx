import { useState, type FormEvent } from 'react'
import { ConfirmButton } from '../../components/ConfirmButton'
import { ErrorText } from '../../components/ErrorText'
import { InfoTip } from '../../components/InfoTip'
import { MoneyInput } from '../../components/MoneyInput'
import { Skeleton } from '../../components/Skeleton'
import { Pencil, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { format } from '../../lib/format'
import { button, card, inputBox, muted } from '../../lib/styles'
import type { Asset, Currency } from '../../lib/types'

const iconButton =
  'rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'

type Draft = { name: string; value: string; currency: Currency; discount: string; sellable: boolean }
const toDraft = (a: Asset): Draft => ({ ...a, value: String(a.value), discount: String(a.discount) })
const empty: Draft = { name: '', value: '', currency: 'USD', discount: '20', sellable: true }

type AssetFormProps = {
  initial: Draft
  submitLabel: string
  onSubmit: (d: Draft) => Promise<void>
  onCancel?: () => void
}

// name, value, quick-sale discount and whether it is for sale; used to add a thing and to edit one
function AssetForm({ initial, submitLabel, onSubmit, onCancel }: AssetFormProps) {
  const [d, setD] = useState(initial)
  const [error, setError] = useState('')
  const set =
    <K extends keyof Draft>(key: K) =>
    (value: Draft[K]) =>
      setD((old) => ({ ...old, [key]: value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await onSubmit({ ...d, name: d.name.trim() })
      setD(initial)
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={submit}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Car, flat, laptop…"
          required
          maxLength={100}
          pattern=".*\S.*"
          value={d.name}
          onChange={(e) => set('name')(e.target.value)}
          aria-label="What it is"
          className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 ${inputBox}`}
        />
        <div className="w-56">
          <MoneyInput
            label="Estimated value"
            required
            min="0.01"
            placeholder="Worth about"
            value={d.value}
            onChange={set('value')}
            currency={d.currency}
            onCurrency={set('currency')}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={d.sellable} onChange={(e) => set('sellable')(e.target.checked)} />I would sell
          it if I had to
        </label>
        {d.sellable && (
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            Quick sale loses
            <span className={`flex items-center ${inputBox}`}>
              <input
                type="number"
                step="1"
                min="0"
                max="90"
                required
                value={d.discount}
                onChange={(e) => set('discount')(e.target.value)}
                className="w-14 bg-transparent px-2 py-1 text-right text-sm text-zinc-900 tabular-nums outline-none dark:text-zinc-100"
              />
              <span className="pr-2 text-sm text-zinc-500">%</span>
            </span>
          </label>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button className={button}>{submitLabel}</button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
    </form>
  )
}

const bodyOf = (d: Draft) => JSON.stringify({ ...d, value: Number(d.value), discount: Number(d.discount) })

type AssetsProps = {
  assets: Asset[]
  // cash on accounts and the things owned, in `currency`; undefined while rates load
  cash: number | undefined
  owned: number | undefined
  currency: Currency
}

// Things owned that could be sold: counted in net worth, kept out of the cash totals and the runway
export function Assets({ assets, cash, owned, currency }: AssetsProps) {
  const [editing, setEditing] = useState<number>()
  const [error, setError] = useState('')

  // api refetches the list before it returns, so writes need no local update
  async function add(d: Draft) {
    await api('/assets', { method: 'POST', body: bodyOf(d) })
  }
  async function save(id: number, d: Draft) {
    await api(`/assets/${id}`, { method: 'PUT', body: bodyOf(d) })
    setEditing(undefined)
  }
  async function remove(id: number) {
    try {
      await api(`/assets/${id}`, { method: 'DELETE' })
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className={card}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Things I own</h2>
        <InfoTip label="About things you own">
          A car, a flat or anything else worth selling. They count in net worth, not in the totals above or in how long
          your savings last; the Plan shows how much time selling one would buy.{' '}
          <a href="#/about?term=owned" className="underline">
            More…
          </a>
        </InfoTip>
      </div>

      {assets.length > 0 && (
        <p className={`mt-1 tabular-nums ${muted}`}>
          Net worth{' '}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {cash !== undefined && owned !== undefined ? format(cash + owned, currency) : <Skeleton />}
          </span>
          {owned !== undefined && <> · {format(owned, currency)} of it in things</>}
        </p>
      )}

      <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
        {assets.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="py-3">
              <AssetForm
                initial={toDraft(a)}
                submitLabel="Save"
                onSubmit={(d) => save(a.id, d)}
                onCancel={() => setEditing(undefined)}
              />
            </li>
          ) : (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{a.name}</p>
                <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {a.sellable
                    ? `quick sale ≈ ${format(a.value * (1 - a.discount / 100), a.currency)} (−${a.discount}%)`
                    : 'not for sale'}
                </p>
              </div>
              <span className="mr-2 font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {format(a.value, a.currency)}
              </span>
              <button
                type="button"
                onClick={() => setEditing(a.id)}
                aria-label={`Edit ${a.name}`}
                className={iconButton}
              >
                <Pencil />
              </button>
              <ConfirmButton
                label={`Delete ${a.name}`}
                className={`${iconButton} hover:text-rose-600`}
                title={`Delete “${a.name}”?`}
                description="It will no longer count in net worth."
                confirmLabel="Delete"
                onConfirm={() => remove(a.id)}
              >
                <Trash2 />
              </ConfirmButton>
            </li>
          ),
        )}
      </ul>
      <ErrorText>{error}</ErrorText>

      <div className="mt-2 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
        <AssetForm initial={empty} submitLabel="Add" onSubmit={add} />
      </div>
    </section>
  )
}

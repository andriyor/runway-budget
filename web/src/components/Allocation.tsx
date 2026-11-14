import { kindIcons, kindLabels } from '../lib/display'
import { iconColors } from '../lib/format'
import { CurrencyIcon } from './icons'
import { format, percentOf } from '../lib/format'
import { card, muted } from '../lib/styles'
import { currencies, accountKinds, type AccountKind, type Account, type Convert } from '../lib/types'

type Slice = {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  // share of the whole, 0..1; undefined until rates load
  share: number | undefined
  detail: string
}

function ShareBar({ title, slices }: { title: string, slices: Slice[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      <div
        className="mt-2 flex h-3 gap-0.5"
        role="img"
        aria-label={`${title}: ${slices.map((x) => `${x.label} ${percentOf(x.share) ?? '?'}%`).join(', ')}`}
      >
        {slices.map((x) => (
          <div
            key={x.key}
            title={`${x.label}: ${percentOf(x.share)}% of total`}
            className={`h-full rounded-[4px] transition-[flex-grow] ${x.color}`}
            style={{ flexGrow: Math.max(0, x.share ?? 0), flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {slices.map((x) => (
          <li key={x.key} className="flex items-start gap-2">
            {x.icon}
            <div className="min-w-0">
              <p className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
                {x.label}
                {x.share !== undefined && <span className="ml-1.5 font-semibold">{percentOf(x.share)}%</span>}
              </p>
              <p className={`truncate tabular-nums ${muted}`}>{x.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const kindColors: Record<AccountKind, string> = { bank: 'bg-violet-600', cash: 'bg-teal-600' }

const accountCount = (n: number) => `${n} ${n === 1 ? 'account' : 'accounts'}`

export function Allocation({ accounts, convert }: { accounts: Account[], convert: Convert }) {
  if (accounts.length === 0) return null
  const uahOf = (list: Account[]) => {
    let total = 0
    for (const a of list) {
      const uah = convert(a.balance, a.currency, 'UAH')
      if (uah === undefined) return undefined
      total += uah
    }
    return total
  }
  const totalUah = uahOf(accounts)
  const shareOf = (list: Account[]) => {
    const uah = uahOf(list)
    return uah === undefined || totalUah === undefined || totalUah <= 0 ? undefined : uah / totalUah
  }

  const byCurrency: Slice[] = currencies
    .map((c) => ({ c, list: accounts.filter((a) => a.currency === c) }))
    .filter(({ list }) => list.length > 0)
    .map(({ c, list }) => ({
      key: c,
      label: c,
      icon: <CurrencyIcon currency={c} />,
      color: iconColors[c],
      share: shareOf(list),
      detail: `${format(list.reduce((sum, a) => sum + a.balance, 0), c)} · ${accountCount(list.length)}`,
    }))

  const byKind: Slice[] = accountKinds
    .map((k) => ({ k, list: accounts.filter((a) => a.kind === k) }))
    .filter(({ list }) => list.length > 0)
    .map(({ k, list }) => {
      const Icon = kindIcons[k]
      const uah = uahOf(list)
      return {
        key: k,
        label: kindLabels[k],
        icon: (
          <span className={`inline-grid size-6 shrink-0 place-items-center rounded-full text-white ${kindColors[k]}`} aria-hidden="true">
            <Icon />
          </span>
        ),
        color: kindColors[k],
        share: shareOf(list),
        detail: `${uah === undefined ? '…' : format(uah, 'UAH')} · ${accountCount(list.length)}`,
      }
    })

  return (
    <section className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Allocation</h2>
        <span className={muted}>share of total at NBU rate</span>
      </div>
      <div className="mt-3 flex flex-col gap-4">
        <ShareBar title="By currency" slices={byCurrency} />
        <ShareBar title="By type" slices={byKind} />
      </div>
    </section>
  )
}

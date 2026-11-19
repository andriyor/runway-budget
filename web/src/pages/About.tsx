import { useEffect, type ReactNode } from 'react'
import {
  Activity,
  ArrowLeftRight,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  Car,
  ChartBar,
  ChartColumn,
  Flag,
  Gauge,
  Hourglass,
  List,
  Lock,
  Milestone,
  Percent,
  Plane,
  Receipt,
  RefreshCw,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  Tags,
  Target,
  TrendingUp,
  Undo2,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { card, muted } from '../lib/styles'

// the README's points, each linking to the page it lives on
const ideas = [
  {
    icon: Sun,
    title: 'One reassuring number',
    text: 'How many months your savings last without income, and when you reach each goal.',
    href: '#/plan',
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  {
    icon: RefreshCw,
    title: 'No manual entry',
    text: 'Monobank transactions sync on their own and sort themselves into categories.',
    href: '#/transactions',
    tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  },
  {
    icon: Hourglass,
    title: 'A cooling-off list',
    text: 'The wishlist shows how long a wish has waited and which goal buying it would push back, instead of saying no.',
    href: '#/plan',
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  {
    icon: SlidersHorizontal,
    title: '“What if” without commitment',
    text: 'Try a lower spending, a new rent or a course, or selling the car, and see the plan move first.',
    href: '#/plan',
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  },
  {
    icon: Repeat,
    title: 'Nothing forgotten',
    text: 'Recurring payments and subscriptions are found from your transactions.',
    href: '#/spending',
    tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  },
]

type Term = { id: string; icon: LucideIcon; term: string; text: ReactNode }

// What the app's words mean and how each number is made. Kept short and in step with the code comments;
// #/about?term=<id> scrolls to one term, which is how the ⓘ tips link here.
const sections: { title: string; icon: LucideIcon; tint: string; terms: Term[] }[] = [
  {
    title: 'Balances',
    icon: Wallet,
    tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
    terms: [
      {
        id: 'rates',
        icon: ArrowLeftRight,
        term: 'Currencies and rates',
        text: 'USD, EUR and UAH accounts are converted at the National Bank of Ukraine rate: today’s for totals, each day’s for history and cash flow.',
      },
      {
        id: 'sync',
        icon: RefreshCw,
        term: 'Monobank sync',
        text: 'Monobank transactions arrive on their own twice a day and sort themselves into categories. Cash and other accounts are kept by hand.',
      },
      {
        id: 'owned',
        icon: Car,
        term: 'Things you own',
        text: 'A car, a flat or anything else worth selling. They count in net worth, not in balances or the runway. A sellable thing’s quick-sale price is its value minus its discount, and the Plan shows how many months selling it would add.',
      },
    ],
  },
  {
    title: 'Plan',
    icon: Target,
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    terms: [
      {
        id: 'spending',
        icon: ShoppingBag,
        term: 'Usual and essential spending',
        text: 'Usual is what you spend in a month, set in Runway (the Transactions chart’s monthly median can fill it in). Essential is the part you cannot cut: rent, groceries, medicine, transport.',
      },
      {
        id: 'income',
        icon: Briefcase,
        term: 'Income that stops or continues',
        text: 'Each income is marked as stopping if you lose your job (a salary) or continuing without one (rent, a pension). Only continuing incomes count in the “without income” estimates.',
      },
      {
        id: 'reserve',
        icon: Lock,
        term: 'Untouchable reserve and available savings',
        text: 'The reserve is money you never plan to spend. Available savings are all balances minus the reserve and minus planned expenses with a fixed number of months, which count as spent now.',
      },
      {
        id: 'runway',
        icon: Plane,
        term: 'Runway',
        text: 'How many months available savings last: savings ÷ (monthly spending − continuing income). Shown without income, on essentials only, and with all income.',
      },
      {
        id: 'surplus',
        icon: TrendingUp,
        term: 'Monthly surplus',
        text: 'All income minus monthly spending. Positive, it fills the emergency fund and goals; negative, savings shrink by that much each month.',
      },
      {
        id: 'inflation',
        icon: Percent,
        term: 'Inflation',
        text: 'The NBU consumer price index over the last 12 published months. The inflation-adjusted dates let spending grow with it while income stays flat, the cautious case.',
      },
      {
        id: 'emergency-fund',
        icon: ShieldCheck,
        term: 'Emergency fund',
        text: 'Savings kept for a set number of months without a job: months × (usual spending − continuing income). It is filled before any goal.',
      },
      {
        id: 'timeline',
        icon: Milestone,
        term: 'Timeline',
        text: 'The emergency fund, then goals from the top, in the order savings fill them. Each date is when savings plus the monthly surplus cover it and everything above it. The what-if sliders try another monthly spending or salary without saving them.',
      },
      {
        id: 'goals',
        icon: Flag,
        term: 'Goals and wishlist',
        text: 'Goals take savings, in order. Wishes take none: each shows how much buying it today would push back the goals, and how long it has been on the list, so a wish can wait before it becomes a goal.',
      },
      {
        id: 'planned',
        icon: CalendarClock,
        term: 'Planned expenses',
        text: 'Costs you are considering, like rent or a course. Turned on, an ongoing one adds to monthly spending, and one with months counts as spent now in full.',
      },
    ],
  },
  {
    title: 'Spending',
    icon: ChartColumn,
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
    terms: [
      {
        id: 'net-spending',
        icon: Receipt,
        term: 'What counts as spending',
        text: 'All accounts together, net of refunds. Moves between your own accounts, investments and cancelled purchases are left out.',
      },
      {
        id: 'usual',
        icon: Activity,
        term: 'Usual, this month',
        text: 'The median of the same days in each of the last 12 complete months, so a half-gone month is compared with half-months. The month’s projection adds the median of what past months spent after today.',
      },
      {
        id: 'budgets',
        icon: Gauge,
        term: 'Category budgets',
        text: 'A monthly cap per category. The tick on each bar is an even pace through the month; amber once ahead of it, red once over the cap.',
      },
      {
        id: 'recurring',
        icon: Repeat,
        term: 'Recurring payments',
        text: 'Merchants charged in at least 3 of the last 6 months, about once a month, mostly for a similar amount, and within the last 40 days. The monthly amount is the latest charge.',
      },
    ],
  },
  {
    title: 'Transactions',
    icon: List,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    terms: [
      {
        id: 'categories',
        icon: Tags,
        term: 'Categories',
        text: 'A transaction’s own category wins over its merchant’s, and the merchant’s over the automatic one from the card payment’s MCC. The Rules page lists every one set by hand.',
      },
      {
        id: 'essential',
        icon: BadgeCheck,
        term: 'Essential flag',
        text: 'Each category is essential or optional by default; a merchant or a single transaction can override it. The «Необхідні» switch shows essential spending only.',
      },
      {
        id: 'usual-range',
        icon: ChartBar,
        term: 'Median and usual range',
        text: 'On the monthly chart: the median complete month, and the usual range, the middle half of the complete months.',
      },
      {
        id: 'cancellations',
        icon: Undo2,
        term: 'Cancelled purchases',
        text: 'Monobank does not link a «Скасування.» to its purchase, so it is paired with the closest earlier purchase from that merchant for the exact opposite amount. Both are left out of spending. A partial refund pairs with nothing and counts as a refund.',
      },
    ],
  },
]

export function About() {
  // #/about?term=runway: scroll to that term once the page is drawn
  const term = new URLSearchParams(location.hash.split('?')[1]).get('term')
  useEffect(() => {
    if (term) document.getElementById(term)?.scrollIntoView({ block: 'center' })
  }, [term])

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">About</h1>
          <p className={`mt-1 ${muted}`}>What the app is for, what its words mean, and how each number is made.</p>
        </div>
        <a
          href="https://github.com/andriyor/runway-budget"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-zinc-300 dark:ring-zinc-800 dark:hover:bg-zinc-800"
        >
          {/* the GitHub mark; lucide no longer ships brand icons */}
          <svg aria-hidden viewBox="0 0 16 16" className="size-4 fill-current">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Source on GitHub
        </a>
      </header>
      {/* the same idea as the top of the README */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 ring-1 ring-zinc-200 sm:p-8 dark:from-indigo-950/60 dark:via-zinc-900 dark:to-emerald-950/40 dark:ring-zinc-800">
        <p className="text-xs font-semibold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
          A calm money tracker
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-balance text-zinc-900 sm:text-4xl dark:text-zinc-50">
          “Am I going to be okay?”
        </h2>
        <p className="mt-1 text-lg text-zinc-500 sm:text-xl dark:text-zinc-400">before “where did my money go?”</p>
        <p className="mt-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Made with anxious and ADHD brains in mind, though it is a tool, not treatment.
        </p>
        {/* three tiles, then two wider ones, so no gap is left on desktop */}
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {ideas.map(({ icon: Icon, title, text, href, tint }, i) => (
            <li key={title} className={i < 3 ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <a
                href={href}
                className="flex h-full gap-3 rounded-xl bg-white/70 p-4 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-zinc-900/60 dark:ring-zinc-800 dark:hover:bg-zinc-900 dark:hover:ring-zinc-700"
              >
                <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-lg ${tint}`}>
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
                  <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">{text}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      {sections.map((s) => (
        <section key={s.title} className={card}>
          <h2 className="flex items-center gap-2.5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <span aria-hidden className={`grid size-8 place-items-center rounded-lg ${s.tint}`}>
              <s.icon size={18} />
            </span>
            {s.title}
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {s.terms.map((t) => (
              <div
                key={t.id}
                id={t.id}
                className={`flex scroll-mt-6 gap-3 rounded-xl p-3 ring-1 sm:odd:last:col-span-2 ${
                  t.id === term
                    ? 'bg-indigo-50 ring-indigo-300 dark:bg-indigo-950/40 dark:ring-indigo-700'
                    : 'bg-zinc-50 ring-zinc-200 dark:bg-zinc-800/40 dark:ring-zinc-800'
                }`}
              >
                <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-lg ${s.tint}`}>
                  <t.icon size={16} />
                </span>
                <div>
                  <dt className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.term}</dt>
                  <dd className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{t.text}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  )
}

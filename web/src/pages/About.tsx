import { useEffect, type ReactNode } from 'react'
import { card, muted } from '../lib/styles'

type Term = { id: string; term: string; text: ReactNode }

// What the app's words mean and how each number is made. Kept short and in step with the code comments;
// #/about?term=<id> scrolls to one term, which is how the ⓘ tips link here.
const sections: { title: string; terms: Term[] }[] = [
  {
    title: 'Balances',
    terms: [
      {
        id: 'rates',
        term: 'Currencies and rates',
        text: 'USD, EUR and UAH accounts are converted at the National Bank of Ukraine rate: today’s for totals, each day’s for history and cash flow.',
      },
      {
        id: 'sync',
        term: 'Monobank sync',
        text: 'Monobank transactions arrive on their own twice a day and sort themselves into categories. Cash and other accounts are kept by hand.',
      },
      {
        id: 'owned',
        term: 'Things you own',
        text: 'A car, a flat or anything else worth selling. They count in net worth, not in balances or the runway. A sellable thing’s quick-sale price is its value minus its discount, and the Plan shows how many months selling it would add.',
      },
    ],
  },
  {
    title: 'Plan',
    terms: [
      {
        id: 'spending',
        term: 'Usual and essential spending',
        text: 'Usual is what you spend in a month, set in Runway (the Transactions chart’s monthly median can fill it in). Essential is the part you cannot cut: rent, groceries, medicine, transport.',
      },
      {
        id: 'income',
        term: 'Income that stops or continues',
        text: 'Each income is marked as stopping if you lose your job (a salary) or continuing without one (rent, a pension). Only continuing incomes count in the “without income” estimates.',
      },
      {
        id: 'reserve',
        term: 'Untouchable reserve and available savings',
        text: 'The reserve is money you never plan to spend. Available savings are all balances minus the reserve and minus planned expenses with a fixed number of months, which count as spent now.',
      },
      {
        id: 'runway',
        term: 'Runway',
        text: 'How many months available savings last: savings ÷ (monthly spending − continuing income). Shown without income, on essentials only, and with all income.',
      },
      {
        id: 'surplus',
        term: 'Monthly surplus',
        text: 'All income minus monthly spending. Positive, it fills the emergency fund and goals; negative, savings shrink by that much each month.',
      },
      {
        id: 'inflation',
        term: 'Inflation',
        text: 'The NBU consumer price index over the last 12 published months. The inflation-adjusted dates let spending grow with it while income stays flat, the cautious case.',
      },
      {
        id: 'emergency-fund',
        term: 'Emergency fund',
        text: 'Savings kept for a set number of months without a job: months × (usual spending − continuing income). It is filled before any goal.',
      },
      {
        id: 'timeline',
        term: 'Timeline',
        text: 'The emergency fund, then goals from the top, in the order savings fill them. Each date is when savings plus the monthly surplus cover it and everything above it. The what-if slider tries another monthly spending without saving it.',
      },
      {
        id: 'goals',
        term: 'Goals and wishlist',
        text: 'Goals take savings, in order. Wishes take none: each shows how much buying it today would push back the goals, and how long it has been on the list, so a wish can wait before it becomes a goal.',
      },
      {
        id: 'planned',
        term: 'Planned expenses',
        text: 'Costs you are considering, like rent or a course. Turned on, an ongoing one adds to monthly spending, and one with months counts as spent now in full.',
      },
    ],
  },
  {
    title: 'Spending',
    terms: [
      {
        id: 'net-spending',
        term: 'What counts as spending',
        text: 'All accounts together, net of refunds. Moves between your own accounts, investments and cancelled purchases are left out.',
      },
      {
        id: 'usual',
        term: 'Usual, this month',
        text: 'The median of the same days in each of the last 12 complete months, so a half-gone month is compared with half-months. The month’s projection adds the median of what past months spent after today.',
      },
      {
        id: 'budgets',
        term: 'Category budgets',
        text: 'A monthly cap per category. The tick on each bar is an even pace through the month; amber once ahead of it, red once over the cap.',
      },
      {
        id: 'recurring',
        term: 'Recurring payments',
        text: 'Merchants charged in at least 3 of the last 6 months, about once a month, mostly for a similar amount, and within the last 40 days. The monthly amount is the latest charge.',
      },
    ],
  },
  {
    title: 'Transactions',
    terms: [
      {
        id: 'categories',
        term: 'Categories',
        text: 'A transaction’s own category wins over its merchant’s, and the merchant’s over the automatic one from the card payment’s MCC. The Rules page lists every one set by hand.',
      },
      {
        id: 'essential',
        term: 'Essential flag',
        text: 'Each category is essential or optional by default; a merchant or a single transaction can override it. The «Необхідні» switch shows essential spending only.',
      },
      {
        id: 'usual-range',
        term: 'Median and usual range',
        text: 'On the monthly chart: the median complete month, and the usual range, the middle half of the complete months.',
      },
      {
        id: 'cancellations',
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
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">About</h1>
        <p className={`mt-1 ${muted}`}>What the words in the app mean, and how each number is made.</p>
      </header>
      {sections.map((s) => (
        <section key={s.title} className={card}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{s.title}</h2>
          <dl className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
            {s.terms.map((t) => (
              <div
                key={t.id}
                id={t.id}
                className={`scroll-mt-6 py-3 sm:grid sm:grid-cols-[14rem_1fr] sm:gap-4 ${
                  t.id === term ? '-mx-2 rounded-lg bg-indigo-50 px-2 dark:bg-indigo-950/40' : ''
                }`}
              >
                <dt className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.term}</dt>
                <dd className="mt-1 text-sm text-zinc-600 sm:mt-0 dark:text-zinc-400">{t.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  )
}

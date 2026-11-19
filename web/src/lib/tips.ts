// General tips from your own numbers: fixed rules with well-known guidelines, never product or investment
// recommendations. Each tip says the number behind it. Pure, so the rules can be tested without a browser.

export type Tip = {
  // stable per rule (and merchant), so a dismissed tip stays dismissed
  id: string
  // watch: worth a look; good: going well; info: worth knowing
  tone: 'watch' | 'good' | 'info'
  title: string
  text: string
  // the page with the card behind it
  href?: string
}

export type TipInput = {
  // months available savings cover: usual and essential spending, less the income that continues without a
  // job; Infinity when that income covers it, undefined when not set
  fundMonths: number | undefined
  essentialMonths: number | undefined
  // the months the emergency fund should cover
  targetMonths: number
  // all income per month and the plan's monthly spending
  income: number
  spending: number | undefined
  // savings in hryvnia, and yearly inflation (0.11) when known
  hryvniaSavings: number
  inflation: number | undefined
  // recurring payments whose latest charge is above their usual one
  priceRises: Array<{ merchant: string; name: string; latest: number; usual: number }>
  // amounts in the shown currency, e.g. "16 414 грн"
  money: (amount: number) => string
}

// below this many months the fund is thin by any guideline
const MIN_FUND_MONTHS = 3
// the share of income many guidelines suggest saving, and where "going well" starts
const LOW_SAVINGS_RATE = 0.1
const GOOD_SAVINGS_RATE = 0.2
// a recurring charge this much above its usual counts as a price rise
const PRICE_RISE = 0.1

const months = (n: number) => `${n.toFixed(1)} months`
const percent = (share: number) => `${Math.round(share * 100)}%`

// Tips worth showing, the most important first: things to look at, then what is worth knowing, then what is
// going well.
export function tipsFor(input: TipInput): Tip[] {
  const { fundMonths, essentialMonths, targetMonths, income, spending, money } = input
  const watch: Tip[] = []
  const info: Tip[] = []
  const good: Tip[] = []

  if (fundMonths !== undefined && fundMonths < MIN_FUND_MONTHS) {
    const essentials =
      essentialMonths !== undefined && essentialMonths > fundMonths
        ? `, or ${essentialMonths === Infinity ? 'all' : months(essentialMonths)} of essentials only`
        : ''
    watch.push({
      id: 'fund-low',
      tone: 'watch',
      title: `Emergency fund: ${months(fundMonths)}`,
      text: `A common guideline is 3–6 months of spending set aside before other goals. Your savings cover ${months(fundMonths)} of usual spending${essentials}.`,
    })
  } else if (fundMonths !== undefined && fundMonths >= targetMonths) {
    good.push({
      id: 'fund-covered',
      tone: 'good',
      title: 'Emergency fund covered',
      text:
        fundMonths === Infinity
          ? 'Income that continues without a job covers your usual spending.'
          : `Your savings cover ${months(fundMonths)} of usual spending, at least the ${targetMonths} you aim for.`,
    })
  }

  if (income > 0 && spending !== undefined) {
    const rate = (income - spending) / income
    if (rate < 0)
      watch.push({
        id: 'savings-negative',
        tone: 'watch',
        title: 'Spending is above income',
        text: `Monthly spending is ${money(spending - income)} more than income, so savings shrink each month. The Timeline’s sliders show what would change that.`,
      })
    else if (rate < LOW_SAVINGS_RATE)
      watch.push({
        id: 'savings-low',
        tone: 'watch',
        title: `Saving ${percent(rate)} of income`,
        text: `Many guidelines suggest saving 10–20% of income. Your plan saves ${money(income - spending)} a month, ${percent(rate)}.`,
      })
    else if (rate >= GOOD_SAVINGS_RATE)
      good.push({
        id: 'savings-good',
        tone: 'good',
        title: `Saving ${percent(rate)} of income`,
        text: `${money(income - spending)} a month, above the 10–20% many guidelines suggest.`,
      })
  }

  const rises = input.priceRises.filter((p) => p.latest > p.usual * (1 + PRICE_RISE))
  if (rises.length === 1) {
    const [p] = rises
    watch.push({
      id: `price-rise:${p.merchant}`,
      tone: 'watch',
      title: `${p.name} costs more`,
      text: `The last charge was ${money(p.latest)}, usually ${money(p.usual)}: ${percent(p.latest / p.usual - 1)} more. Worth checking whether it is still worth it.`,
      href: '#/spending',
    })
  } else if (rises.length > 1) {
    const extra = rises.reduce((sum, p) => sum + p.latest - p.usual, 0)
    watch.push({
      id: `price-rise:${rises
        .map((p) => p.merchant)
        .sort()
        .join(',')}`,
      tone: 'watch',
      title: `${rises.length} recurring payments cost more`,
      text: `${rises.map((p) => p.name).join(', ')}: ${money(extra)} a month more than usual together. Worth checking whether each is still worth it.`,
      href: '#/spending',
    })
  }

  if (input.inflation !== undefined && input.inflation > 0 && input.hryvniaSavings > 0) {
    info.push({
      id: 'inflation-hryvnia',
      tone: 'info',
      title: 'Inflation and hryvnia savings',
      text: `At ${percent(input.inflation)} yearly inflation, ${money(input.hryvniaSavings)} in hryvnia loses about ${money(input.hryvniaSavings * input.inflation)} of buying power a year, unless it earns at least that.`,
    })
  }

  return [...watch, ...info, ...good]
}

# Runway Budget

A calm money tracker: it answers "am I going to be okay?" before "where did my money go?". Made with
anxious and ADHD brains in mind, though it is a tool, not treatment.

- **One reassuring number**: how many months your savings last without income, and when you reach each goal.
- **No manual entry**: Monobank transactions sync on their own twice a day and sort themselves into categories.
- **A cooling-off list for impulse buys**: the wishlist shows how long a wish has waited and which goal buying
  it would push back, instead of saying no.
- **"What if" without commitment**: try a lower spending, a new rent or a course, or selling the car, and see the
  plan move before deciding anything.
- **Nothing forgotten**: recurring payments and subscriptions are found from your transactions.

Under the hood it is a personal balance tracker for USD, EUR and UAH accounts, converted at the official
[National Bank of Ukraine](https://bank.gov.ua) rate, that analyses spending from Monobank transactions
(against the usual, budgets, recurring payments, inflation).

![A calm money tracker: "Am I going to be okay?" before "where did my money go?", with the five ideas](https://github.com/user-attachments/assets/6858dca2-572a-4228-9ec0-b8eb6584920f)

![Plan: timeline with the surplus, savings rate and what-if sliders, tips, planned expenses, runway, emergency fund, goals and wishlist](https://github.com/user-attachments/assets/2394767a-de7e-4d4b-a274-3b92e27092a4)

<details>
<summary>More screenshots</summary>

|                                                                                                                                                                                                          |                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Balances: totals, balance over time from tracked accounts, allocation, things owned and accounts](https://github.com/user-attachments/assets/94ca5d8f-8237-4214-99bc-f7f3dfcb030c)                     | ![Spending: this month against the usual, category budgets, cash flow and more](https://github.com/user-attachments/assets/bbee7629-4815-440b-9613-1548111e2e1e) |
| ![Transactions: balance over time, spending per month, and spending by category and merchant against the period before](https://github.com/user-attachments/assets/11cc7894-2bfb-489d-a76d-bd586733eb53) | ![A category selected: its monthly trend, subcategories and merchants](https://github.com/user-attachments/assets/867aed42-38cf-4c7a-acf4-458f4d647ee9)          |
| ![Spending by merchant against the period before](https://github.com/user-attachments/assets/257acfdc-c039-4013-9fda-9dbd0ae0cab9)                                                                       | ![Essential spending only, with its median](https://github.com/user-attachments/assets/097d9900-7805-4e2a-9ba9-31bcdb7b91f5)                                     |
| ![Balances on a phone](https://github.com/user-attachments/assets/004714b9-b85d-4bf4-ab6e-119dc4b74ba0)                                                                                                  | ![Category rules: merchant rules and single-transaction overrides](https://github.com/user-attachments/assets/1eb545a8-348e-4659-8717-0a29793f6a88)              |
| ![About: the app's idea and the terms of each page](https://github.com/user-attachments/assets/87d7f7c4-169b-4345-9909-d82c316ce7a4)                                                                     |                                                                                                                                                                  |

</details>

Screenshots use made-up data from the demo seed (see [Demo data](#demo-data)) and were taken on
2026-11-19; they live in [issue #5](https://github.com/andriyor/runway-budget/issues/5).

## Features

Five pages, in the tab bar: **Balances**, **Spending**, **Transactions**, **Plan** and **About**.

### Balances

- **Accounts**: add cash or bank accounts in USD, EUR or UAH. Each row shows its balance, with buttons to add or
  subtract an amount, edit its name, type, balance and currency, or delete it after a confirmation; reorder them with the arrows.
- **Totals**: all balances summed in each currency at the NBU rate of the day.
- **Allocation**: the share of the total by currency and by account type (bank or cash).
- **Balance over time**: the total at the end of every day since the first transaction, each day at its
  own NBU rate, with what exchange rates added to or took from the USD and EUR balances. Only accounts with
  transactions have a history, so the rest are left out, with their count and sum named; "Include them" draws
  them flat at today's balance.
- **Things I own**: a car, a flat or anything else worth selling, with its estimated value, the percent a
  quick sale would lose (20% by default) and whether you would sell it at all (not the home you live in).
  They add up to a net worth beside the cash, but stay out of the totals, the runway and the emergency fund.

On desktop the overview sits on the left and the accounts list beside it, staying in view while you scroll.

### Spending

All accounts together, in Runway's currency.

- **This month against the usual**: each category's spending from the 1st to today next to the median
  of the same days in the last 12 complete months, with the change in percent («Продукти +34%»), and
  the same days a year ago. Same days rather than whole months, so a half-gone month does not look cheap.
  Above it, the pace: «spent X by 14 листопада, on track for Y», where Y is X plus the median of what past
  months spent after that day, red when above Runway's monthly spending (or the usual month without a budget).
- **Category budgets**: a monthly cap per top-level spending category, in any currency, with this
  month's spending against it: a bar with a tick at an even pace for the day, amber once ahead of that
  pace, red once over the cap. Picking a category that has a cap edits it.
- **Cash flow**: income (`Надходження`), spending and savings rate over the last 12 complete
  months across all accounts, with a per-month table. The median income can be sent to Runway as an
  `Average income` entry (sending it again updates that entry), so runway and goal dates use what you actually earn.
  Spending also shows its usual range (the middle half of the months, p25–p75)
  and the lowest and worst months, since Runway assumes every month costs the same. Each transaction
  is converted at its day's NBU rate, and a Rates column shows what rate moves did to the USD and EUR
  balances each month. The other Spending cards use today's rate. «In today's prices» scales each month
  by consumer prices since, so months compare in real terms.
- **Recurring payments**: rent, subscriptions and regular donations, found as a merchant charged about
  once a month for a similar amount in at least 3 of the last 6 months and within the last 40 days,
  with the latest charge, the expected next date and the committed monthly total.
- **Spending per year**: each category's total for the last 3 calendar years, this one to date, with the
  change from the same part of last year (1 January to today).

### Transactions

- the account's balance over time, with the picked period shaded and its change; drag across it (or tap
  two days on a phone) to filter by any range of days, shown as a removable chip in the period picker;
- a stacked chart of spending per month by category, with a median line and a shaded usual range (p25–p75) over complete months;
  picking a category or merchant reduces the bars to it to show its trend, and a year or quarter
  filter shows only its months (a picked month shows its year);
- spending by category with a drill-down into subcategories, and how the total and each category changed
  from the period before (the month, quarter, year or week before; a week earlier for a day; as many days
  before for a range; a running period against as many days of the one before), left out when that period
  starts before the first transaction; a **грн | %** switch shows each change in money (the default) or percent,
  with the other form and both totals on hover;
- spending by merchant, with the same change from the period before (within a picked category);
- filters by month, quarter, year or ISO week, category and merchant, all clickable from the charts;
  the period picker chooses the kind (Усе, Рік, Квартал, Місяць, Тиждень), steps with ‹ › and lists
  only that kind's periods ([Base UI](https://base-ui.com) toggle group and select);
- the filter card: the account with its balance and Sync on top, the period and «Усі витрати | Необхідні»
  under it, and the category and merchant picked in the charts as removable chips; on desktop it stays
  at the top while the page scrolls;
- sorting by date or amount and a note on any transaction.
- opens on the latest month with transactions, with the chart showing its year; «Усе» in the period picker shows everything.
- the account picker lists only accounts with transactions (bank-synced or manually adjusted).

### Plan

Shown in USD, EUR or UAH: a switcher in the header converts every calculated figure and is remembered in
the browser. Goal and wish amounts keep their own currency, with the converted value beside them.

- **Timeline**: the emergency fund, then each goal in the order savings fill them, with the date each is
  reached at today's spending, what is already saved and what is left. The monthly surplus heads it. A "What if I spend per month" slider,
  from essential spending to 1.5× the usual, re-plans it without saving: every date
  moves (and the fund's size, when essential spending is not set), along with the surplus, each with how many months sooner or later than the plan, and "Use as my
  spending" saves it. A "What if my salary is" slider, from no job to twice today's, does the same for the
  incomes that stop without a job, to see what a new job would do to each goal; the emergency fund stays.
- **Tips**: up to three general tips from your own numbers, each with the number behind it: an emergency fund
  under 3 months or covered, a savings rate under 10% or over 20%, spending above income, recurring payments
  that got more expensive, and what inflation takes from hryvnia savings. Fixed rules in the browser, never
  product or investment recommendations; each can be dismissed.
- **Planned expenses**: costs you are considering, like rent or an English course, per month and in any
  currency, ongoing or for a number of months. Each shows the runway without income and the monthly surplus
  without it and with it. Turned on, the timeline and every card below count it: an ongoing one as monthly
  spending, one with months as its whole cost spent now. "Start paying" moves an ongoing one into your spending.
- **Runway**: settings shown read-only until you edit them: monthly spending, optional named incomes (each in
  its own currency, marked as stopping if you lose your job, like a salary, or continuing without one, like
  rent or a pension), an optional essential-spending budget, an optional untouchable reserve and how many
  months the emergency fund should cover. Beside them, how many months your savings last with and without
  income, and the most you can spend per month to last the fund's months. When income covers spending, the
  card with income leads with the monthly surplus, its yearly total and its share of income. Each estimate also shows how long
  it lasts with spending growing by the last 12 months' inflation and incomes staying flat.
  Under the essentials-only estimate, how many more months selling each thing you own would add at essential
  spending (usual spending when essential is not set).
- **Emergency fund**: how many months of essential and of usual spending your available savings cover
  (goals keep the essential one aside, since big purchases stop after a job loss),
  against the months set in Runway (6 if not set) and the 3-month minimum: red below 3, amber below the
  target, green once funded. Income that continues without a job lowers what a month takes from savings.
- **Goals**: target amounts in priority order. Savings fill the emergency fund first, then goals from the
  top, so on a goal's date you can buy it and still keep the fund. Each shows its progress and the date at
  your monthly surplus (income minus spending), and when, with spending growing by inflation and income
  flat, or that spending catches up first. A goal not started yet says what it waits for.
- **Wishlist**: purchases you are tempted by but have not committed to. They take no savings; each shows how
  far buying it today pushes back each goal, how many months of surplus it costs and how long it has been on
  the list, and can be turned into a goal.

### Everywhere

- **Monobank sync**: pull the last month of one Monobank card's transactions and set the account
  balance from them, on demand and automatically at 09:00 and 21:00.
- **Phones**: a bottom tab bar with icons, one line per currency total, two-line account rows, a
  Transactions page whose monthly chart shows one quarter at a time, and Plan rows that keep the name on
  its own line (the timeline's date over its months, a goal's, wish's or planned expense's amount under it).
- **Categories**: transactions are sorted into categories and subcategories automatically from their
  MCC. Correct one transaction or every transaction from a merchant, and mark transfers as income,
  moves between your own accounts or investments so they do not count as spending.
  The **Rules** page (linked from Transactions) lists every merchant and single-transaction override to
  change or reset.
- **About**: what the app is for, and every term on its pages (runway, surplus, emergency fund, usual
  spending, recurring payments, category rules, cancelled purchases, …) with how each number is made.
  The ⓘ tips on each page link to their term.
- **Themes**: System, Light, Dark and Paper, a warm cream theme with a green accent and a monospace font,
  switched in the top bar and remembered in the browser.
- **Minimal month**: spending is essential (rent, groceries, medicine, …) or optional. The
  «Усі витрати | Необхідні» switch shows only essential spending. The chart's monthly median can be sent to Runway: the full median as
  monthly spending, the essential one as essential spending.

## Compared with other self-hosted apps

Open-source apps you can host yourself, from my notes as of 2026-11-18 (stars and last push change):

| App                                                        | Stars  | Language   | License  | Storage                            | Monobank                 | Monthly budget | Goals | Phone                                            | MCP                     | Note                                                                                              |
| ---------------------------------------------------------- | ------ | ---------- | -------- | ---------------------------------- | ------------------------ | -------------- | ----- | ------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Runway Budget**                                          | 2      | TypeScript | none     | SQLite                             | direct, twice a day      | per category   | yes   | web, phone layout                                | HTTP API + Claude skill | runway in months, goal dates, "what if", wishlist cooling-off, finds recurring payments; one user |
| [Actual](https://github.com/actualbudget/actual)           | 29,963 | TypeScript | MIT      | SQLite                             | via a self-hosted bridge | per category   | yes   | web, third-party iOS (Actuali)                   | community               | dated design, weak charts, no multi-currency                                                      |
| [Firefly III](https://github.com/firefly-iii/firefly-iii)  | 25,067 | PHP        | AGPL-3.0 | MySQL, MariaDB, PostgreSQL, SQLite | via a webhook bot or CSV | per category   | yes   | third-party iOS (Abacus), Android (Waterfly III) | third-party             | old UI                                                                                            |
| [keepard](https://github.com/sars/keepard)                 | 12     | TypeScript | AGPL-3.0 | PostgreSQL                         | direct                   | none           | none  | PWA                                              | none                    | two months old, exactly two users, fixed Europe/Riga time zone                                    |
| [ezbookkeeping](https://github.com/mayswind/ezbookkeeping) | 5,983  | Go         | MIT      | SQLite, MySQL, PostgreSQL          | file import              | none           | none  | web, third-party iOS (ezBookLedger)              | official                |                                                                                                   |
| [FinTrack](https://github.com/fintrack-team/FinTrack)      | 6      | TypeScript | MIT      | PostgreSQL                         | direct, manual import    | unknown        | none  | web                                              | none                    | AI insights with your own key, Telegram bot; USD, UAH, EUR only                                   |
| [Securo](https://github.com/securo-finance/securo)         | 4,182  | Python     | AGPL-3.0 | PostgreSQL, Redis                  | CSV                      | per category   | yes   | web                                              | none                    | auto sync only in Brazil, US, Europe                                                              |
| [Budget Board](https://github.com/teelur/budget-board)     | 896    | C#         | AGPL-3.0 | PostgreSQL                         | CSV                      | per category   | yes   | web                                              | none                    | sync through SimpleFIN or LunchFlow (US)                                                          |
| [Ghostfolio](https://github.com/ghostfolio/ghostfolio)     | 9,650  | TypeScript | AGPL-3.0 | PostgreSQL, Redis                  | none                     | none           | none  | web, iOS                                         | none                    | investment portfolio tracker, not a budget                                                        |
| [Paisa](https://github.com/ananthakumaran/paisa)           | 3,232  | TypeScript | AGPL-3.0 | ledger files, SQLite               | CSV                      | per category   | yes   | web                                              | none                    | plain-text accounting on ledger                                                                   |

Features, same order:

| App               | Goal reach date         | Currencies                                                  | Own categories                  | Reports                                                                                                                      | Imports from                    |
| ----------------- | ----------------------- | ----------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Runway Budget** | from your saving pace   | USD, EUR, UAH at the NBU rate, display currency in settings | yes, auto from MCC and merchant | this month vs usual, category budgets, cash flow, year over year, inflation, balance over time, category and merchant trends |                                 |
| Actual            | from a deadline you set | single currency                                             | yes                             | basic, weak charts                                                                                                           | YNAB4, nYNAB                    |
| Firefly III       | from a deadline you set | display currency in settings                                | yes                             | dashboard and charts                                                                                                         | YNAB4, Spendee (community)      |
| keepard           | none                    | quick switch in the header                                  | yes                             | by category, period and person; assets chart                                                                                 |                                 |
| ezbookkeeping     | none                    | display currency in settings                                | yes                             | statistics and trends                                                                                                        | GnuCash, Firefly III, Beancount |
| FinTrack          | none                    | several                                                     | ?                               | income vs spending by week, month, year                                                                                      |                                 |
| Securo            | ?                       | display currency in settings                                | yes                             | reports                                                                                                                      |                                 |
| Budget Board      | ?                       | single currency                                             | yes                             | spending and net worth                                                                                                       |                                 |
| Ghostfolio        | none                    | display currency in settings                                | n/a                             | portfolio charts                                                                                                             |                                 |
| Paisa             | ?                       | display currency in settings                                | yes                             | dashboard, cash flow                                                                                                         | ledger, hledger, beancount      |

## Compared with cloud apps

Hosted apps that are worth a look for a Monobank user:

| App                                                                      | Price                                        | Platforms         | Monobank                                                  | Monthly budget | Goals            | MCP / API                                | Note                                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------- | ----------------- | --------------------------------------------------------- | -------------- | ---------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| [Midni](https://midni.finance/)                                          | free basic, Premium 99 ₴/month or 990 ₴/year | Android, iOS, web | direct, past transactions too                             | per category   | yes              | MCP in Premium (Claude, ChatGPT, Cursor) | Ukrainian; Monobank sync, statement import and MCP need Premium                         |
| [Saldo](https://play.google.com/store/apps/details?id=com.saldo.finance) | free                                         | Android, iOS      | direct, new transactions only                             | yes            | ?                | none                                     | phone only                                                                              |
| [FinEye](https://fineye.app/)                                            | free with in-app purchases                   | Android, iOS      | direct, new transactions only                             | per category   | ?                | none                                     | cash flow, net worth, several currencies; imports from Saldo, Wallet, Spendee, Zenmoney |
| [Zenmoney](https://zenmoney.app/)                                        | from 149 ₽/month                             | Android, iOS, web | direct                                                    | per category   | ?                | official MCP                             | Russian company                                                                         |
| [YNAB](https://www.ynab.com/)                                            | $14.99/month or $109/year                    | Android, iOS, web | via a self-hosted bridge (monobudget, monobank-ynab-sync) | per category   | yes, by deadline | official API                             | one currency per budget                                                                 |
| [Lunch Money](https://lunchmoney.app/)                                   | $10/month or $100/year                       | Android, iOS, web | via self-hosted monobudget, not updated since 2025-01     | per category   | ?                | API                                      |                                                                                         |
| [Spendee](https://www.spendee.com)                                       | Plus $1.99/month, Premium ~$3–6/month        | Android, iOS, web | broken (checked 2026-11-04)                               | per category   | ?                | none                                     |                                                                                         |
| [Wallet by BudgetBakers](https://budgetbakers.com/)                      | Premium, price by region                     | Android, iOS, web | broken (checked 2026-11-04)                               | per category   | yes              | none                                     | strong charts; base currency can't be changed later                                     |

## Stack

pnpm workspace with two apps and a shared types package:

| Path      | What                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/`    | [Fastify](https://fastify.dev) + TypeScript, SQLite via [Drizzle ORM](https://orm.drizzle.team) and `better-sqlite3`                             |
| `web/`    | React + TypeScript + [Vite](https://vite.dev), styled with [Tailwind CSS](https://tailwindcss.com), charts with [Recharts](https://recharts.org) |
| `shared/` | `@runway-budget/shared`: TypeScript types for the API's JSON responses                                                                           |

## Getting started

Requires Node.js 24 and pnpm.

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts the API on <http://localhost:3000> and the web app on <http://localhost:5173>.
The API's routes live under `/api`, and the web dev server proxies `/api/*` to it. The SQLite database `api/data.db` is created and
migrated on first start; set `DB_FILE` to use another path.

## Demo data

`api/scripts/seed-demo.mjs` builds a separate database with made-up accounts, a budget, goals, things
owned, planned expenses and a
year of Monobank-style transactions (public shop names; people, landlord and employer are invented).
It refuses to overwrite an existing file, so it never touches `api/data.db`. To run the app on it
next to your own:

```sh
pnpm --filter api demo:seed /tmp/demo.db
(cd /tmp && DB_FILE=/tmp/demo.db "$OLDPWD/api/node_modules/.bin/fastify" start -p 3124 "$OLDPWD/api/dist/app.js")
API_URL=http://localhost:3124 pnpm --filter web exec vite --port 5174
```

The API is started outside `api/` so it does not load your Monobank token from `api/.env`; build the
API first (`pnpm build`) so `api/dist` exists. `API_URL` points the web dev server's `/api` proxy at
any API (default `http://localhost:3000`).

## Docker

```sh
docker compose up -d --build
```

Serves the app on <http://localhost:8080> from a single container: the API serves the built web app
at `/` and its own routes under `/api`. The SQLite database is kept in the `data` volume.
`api/.env` is passed to the API container when it exists. The API container runs in
`TZ=Europe/Kyiv` so the Monobank sync happens at local 09:00 and 21:00; change `TZ` in
`compose.yaml` for another time zone.

## Monobank

Create a personal token at <https://api.monobank.ua> and put it in `api/.env` (git-ignored, loaded
by the API on start):

```sh
MONO_TOKEN=...
MONO_ACCOUNT=...   # card account id from /personal/client-info
```

With these set, the API syncs on its own at 09:00 and 21:00 local time; press **Sync Monobank** on
the Transactions page to sync right away. Each sync fetches the last 31 days. To fill in older
history, call the sync endpoint once per earlier 31-day window, a minute apart (Monobank's rate
limit):

```sh
curl -X POST "localhost:3000/api/accounts/mono/sync?to=$(date -v-31d +%s)"
```

Re-syncing a window you already have adds nothing new but fills in each stored transaction's
`operationAmount` and `currencyCode`, which pair foreign-currency cancellations with their purchases.

## Scripts

Run from the repository root:

| Command                              | What                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `pnpm dev`                           | Start API and web in watch mode                                                                  |
| `pnpm build`                         | Build both apps                                                                                  |
| `pnpm test`                          | Type-check and run API tests (in-memory SQLite), and the web's unit tests; does not touch `dist` |
| `pnpm lint`                          | Lint the web app with oxlint                                                                     |
| `pnpm format`                        | Format every file with Prettier                                                                  |
| `pnpm format:check`                  | Check formatting without changing files                                                          |
| `pnpm --filter api demo:seed <file>` | Create a demo database (see [Demo data](#demo-data))                                             |

To work on one app: `pnpm --filter api dev` or `pnpm --filter web dev`.

## Claude skills

`.claude/skills/` holds [Claude Code](https://claude.com/claude-code) skills for this repository:

| Skill                                                     | What                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `runway-api`                                              | Read and change your data through the API («how long do my savings last», «add rent»)    |
| `screenshots`                                             | Retake the README screenshots from the demo seed and publish them in an issue            |
| `rozetka-notes`, `prom-notes`, `olx-notes`, `brain-notes` | Note what was bought on each shop's transactions, read from your order history in Chrome |

The shop skills match orders by date and amount (`match-orders.py` for Rozetka and Prom), note refunds and
OLX sales too, and ask before writing.

## Database

The schema lives in `api/src/db/schema.ts`. After changing it, generate a migration:

```sh
pnpm --filter api db:generate
```

Migrations in `api/drizzle/` are applied automatically when the API starts. Money is stored in
integer minor units (cents/kopiykas).

## API

| Method   | Path                                                   | What                                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/accounts`                                            | List accounts, each with its `transactionCount`                                                                                                                                                                                           |
| `GET`    | `/accounts/:id/transactions`                           | Transactions, newest first, with `merchant`, `category`, `categorySource`, `essential`, `essentialSource`, `mccDescription`, `merchantDomain`, `note` and `cancelled`                                                                     |
| `GET`    | `/categories`                                          | Category tree `{ id, label, emoji, spending, subcategories: [{ id, label, essential }] }`                                                                                                                                                 |
| `GET`    | `/categories/rules`                                    | Hand-set overrides: `merchants: [{ merchant, description, category, essential, transactionCount }]` and single `transactions: [{ id, accountId, description, time, amount, currency, category, essential }]`; `null` where left automatic |
| `PUT`    | `/categories/merchants`                                | Set a merchant's category `{ description, category }`; `category: null` resets it                                                                                                                                                         |
| `PUT`    | `/categories/transactions/:id`                         | Set one transaction's category `{ category }`; `null` resets it                                                                                                                                                                           |
| `PATCH`  | `/transactions/:id`                                    | Set a transaction's `{ note?, essential? }`; empty note or `null` clears                                                                                                                                                                  |
| `PUT`    | `/categories/merchants/essential`                      | Mark a merchant essential `{ description, essential }`; `null` resets it                                                                                                                                                                  |
| `POST`   | `/accounts/mono/sync`                                  | Import 31 days from Monobank ending at `?to=` (unix seconds, default now)                                                                                                                                                                 |
| `POST`   | `/accounts`                                            | Create account `{ name, currency, balance, kind? }` (`bank` default or `cash`)                                                                                                                                                            |
| `PUT`    | `/accounts/order`                                      | Reorder: `{ ids }` with every account id in order                                                                                                                                                                                         |
| `PATCH`  | `/accounts/:id`                                        | Update any of `name`, `currency`, `balance`, `kind`                                                                                                                                                                                       |
| `DELETE` | `/accounts/:id`                                        | Delete account                                                                                                                                                                                                                            |
| `GET`    | `/budget`                                              | Monthly spend, incomes and reserve, or `null`                                                                                                                                                                                             |
| `PUT`    | `/budget`                                              | Set `{ monthlySpend, currency, incomes?: [{ name, amount, currency, keeps }], reserve?, reserveCurrency?, minimalSpend?, minimalSpendCurrency?, targetMonths? }`                                                                          |
| `GET`    | `/category-budgets`                                    | Monthly caps per category                                                                                                                                                                                                                 |
| `PUT`    | `/category-budgets/:category`                          | Set or replace a top-level spending category's cap `{ amount, currency }`                                                                                                                                                                 |
| `DELETE` | `/category-budgets/:category`                          | Remove a cap                                                                                                                                                                                                                              |
| `GET`    | `/goals`                                               | List goals and wishes in priority order, each with `wish` and `addedAt`                                                                                                                                                                   |
| `POST`   | `/goals`                                               | Create a goal, or a wish with `wish: true`, last in order `{ name, target, currency, wish? }`                                                                                                                                             |
| `PUT`    | `/goals/order`                                         | Reorder: `{ ids }` with every goal and wish id in order                                                                                                                                                                                   |
| `PUT`    | `/goals/:id`                                           | Replace a goal's `{ name, target, currency, wish? }`; `wish` is kept when left out, `false` makes a wish a goal                                                                                                                           |
| `DELETE` | `/goals/:id`                                           | Delete a goal or wish                                                                                                                                                                                                                     |
| `GET`    | `/rates`                                               | NBU rates as UAH per unit, cached for an hour                                                                                                                                                                                             |
| `GET`    | `/rates/history?from=YYYY-MM-DD`                       | NBU rates for every day from `from` to today, cached for 12 hours                                                                                                                                                                         |
| `GET`    | `/inflation?from=YYYY-MM`                              | Ukraine's CPI, % change from the previous month, per published month (via the NBU), cached for a day                                                                                                                                      |
| `GET`    | `/stats/spending-per-year?currency=UAH&tz=Europe/Kyiv` | Spending per category and year, and last year's up to today's date, at today's NBU rates; `tz` sets the local day                                                                                                                         |

## How estimates work

- **Available savings** = total balance − untouchable reserve, converted at NBU rates.
- **Inflation** = the product of the last 12 published months' CPI changes. In estimates, spending grows by
  it every month (yearly rate^(1/12)) while incomes stay flat, the cautious case; savings lasting over
  100 years count as no end. «In today's prices» multiplies a month by the CPI rise from it to the latest
  published month.
- **From exchange rates** = each day's change in total value − that day's transactions at the same rate,
  which is yesterday's USD and EUR balances times the rate change.
- **Runway** = available savings ÷ monthly loss (spending, or spending − all incomes). A month is 30.44 days.
- **Usual range** = the 25th to 75th percentile of complete months' spending, shown from 4 months on,
  on the monthly spending chart as a shaded band and in both places with the lowest and worst months.
- **Savings rate** = (income − spending) ÷ income, summed over the shown months rather than a median
  of monthly rates, so one month of tiny income cannot skew it. Moves between your own accounts and
  investments count as neither income nor spending.
- **Emergency fund** = months to cover × (essential spending − income that continues without a job), with
  usual spending when essential is not set.
- **Goal ETA** = (emergency fund + the targets of this goal and every goal above it − available savings)
  ÷ monthly surplus. Savings and the surplus fill the fund first, then goals in order.
- **Wish delay** = how much further each goal ends up once the price leaves savings, ÷ monthly surplus.

Estimates assume flat spending and income, and ignore interest and inflation.

## Technical decisions

- **Monobank account is linked by id.** The account stores `mono_account_id`, so every sync updates
  the same account instead of creating a new one. Its currency comes from `client-info` when it is
  first created.
- **Sync is idempotent.** Each transaction keeps Monobank's own `id` under a unique index, and
  inserts skip ones already stored, so syncing twice never duplicates anything.
- **Balance excludes the credit limit.** Monobank's balance includes the bank's money, so the balance
  is the latest transaction's balance minus `creditLimit` from `client-info`.
- **Transactions store the account-currency amount.** A foreign purchase is saved as what it cost
  in the card's currency (`amount`), not the original operation amount.
- **One request per sync window.** Monobank allows one call per minute per endpoint and up to
  31 days + 1 hour per statement. A sync fetches exactly that window; a too-early sync returns 429.
  Monobank also caps a statement at 500 items, so a busier month would be cut off; paging is not
  implemented.
- **Two-level categories instead of raw MCC.** `api/src/categories.ts` holds one tree: 16 spending
  categories with subcategories (Продукти › Супермаркет, …), plus service categories without
  subcategories: `Перекази` (spending), `Надходження`, `Між своїми рахунками` and `Інвестиції`
  (not spending). MCC
  ranges sit on subcategories; where they overlap, the first in table order wins. A transaction and
  every stored override always hold a leaf id (a subcategory, or a category without any), and the
  web groups leaves under their parent. Some subcategories (food delivery, electricity, loans) have
  no MCC of their own and only fill through overrides. The raw MCC is still shown as `mccDescription`, from the
  Ukrainian `fullDescription` in [Oleksios/Merchant-Category-Codes](https://github.com/Oleksios/Merchant-Category-Codes)
  (MIT, license in `api/src/data/mcc.LICENSE`).
- **Category is decided on read, in this order:** the transaction's own category, then your
  merchant override, then the jar rule (`Поповнення «…»` is `ЗСУ і фонди`), then the MCC table,
  else `Інше › Інші витрати`. A positive transfer becomes `Надходження` (income). Only your explicit choices are stored,
  so changing a rule relabels the rest of history.
- **Two levels of override.** `transactions.category` fixes a single purchase (a Bluetti from
  Rozetka) without moving the merchant. `merchant_categories` keys on the lowercased description with the
  `Скасування. ` prefix stripped, so one correction covers every purchase and refund from that
  merchant.
- **Spending is net of refunds.** The summaries sum each category's or merchant's amounts, so a
  refund lowers what it belongs to. `Надходження`, `Між своїми рахунками` and `Інвестиції` are not
  spending and stay out of every summary and chart.
- **A cancelled purchase counts as nothing.** Monobank sends no link between a `Скасування. X` and
  the purchase it reverses (no field in the statement refers to another item, and cancellations have
  no `receiptId`), so `api/src/cancellations.ts` pairs them on read: the closest earlier unpaired
  purchase from the same merchant for the exact opposite `operationAmount` in the same `currencyCode`.
  Not the account-currency `amount`, because each side of a foreign purchase is converted at its own
  day's rate. Both rows come back with `cancelled: true`; the charts, summaries and cash flow skip
  them, so a purchase on the 30th cancelled on the 2nd no longer moves spending between months, and
  the list shows them struck through. The balance chart keeps them, since the money did move. A
  partial refund has no exact pair and stays an ordinary refund. Some shops refund with a transfer
  instead: OLX sends `Від: OLX_DOSTAVKA UAPAY`, which pairs with an earlier OLX purchase the same way, and
  sometimes a sender Monobank hides (`Від: #traceable #traceable`), which pairs with any purchase of the
  exact amount up to 3 days earlier; the OLX payout for something you sold has no purchase and stays
  income. Rows synced before the operation
  columns pair on `amount` until a sync of their window fills them in (see [Monobank](#monobank)).
- **A merchant is its normalized description.** The API returns `merchant` (lowercased, `Скасування. `
  stripped), the same key merchant overrides use, so the merchant summary, filter and corrections
  agree. Different spellings of one shop (`MOLLI 1`, `Molli`) stay separate merchants.
- **Merchant icons come from a hand-kept keyword map.** Monobank sends no logos, only a description
  such as `Apple` or `Сільпо`. `api/src/data/merchants.json` maps a domain to name fragments, matched
  case-insensitively on read; the web app shows that domain's favicon from Google's favicon service
  (which therefore sees the shown domains). Unmatched merchants show their category's emoji. Add a
  line to the map to cover a new shop.
- **Transactions are deleted with their account** via an `ON DELETE CASCADE` foreign key.
- **Essential follows the category, with the same two override levels.** Each subcategory carries an
  `essential` default in `api/src/categories.ts` (housing, groceries, medicine, mobile and internet,
  public transport, fuel, mandatory payments, pets). A merchant flag (`merchant_essentials`) and a
  transaction flag (`transactions.essential`) win over it, independently of the category overrides.
  The minimal month is the median of essential spending over complete months.
- **Scheduled sync runs in the API process.** `api/src/plugins/mono-schedule.ts` sets a timer for the
  next 09:00 or 21:00 local, so it works the same under `pnpm dev` and Docker without a cron. Fixed
  times rather than "every 12 hours from start", because dev restarts the server on every change and
  Monobank allows one statement request per minute. Each run re-reads 31 days, so a run missed while
  the server was down loses nothing. The route and the schedule share `api/src/mono.ts`.
- **Summaries and filters run in the browser.** The page loads an account's whole transaction list
  and groups it by month, ISO week, category and merchant locally, so month and week boundaries use
  the viewer's time zone and switching filters needs no request. At ~1,500 transactions grouping
  takes well under a millisecond; what cost time was rendering. The list therefore shows 100 rows at
  a time («Показати ще» for more), and a row's category and essential flag are plain buttons that
  swap in their dropdown only when clicked. That took a year of transactions from 153k page
  elements (108k dropdown options) and ~1.4 s per filter change to 1.8k elements and ~40 ms.
  The exception is Spending per year, summed by `/stats/spending-per-year` with the viewer's time zone.
- **Monthly chart folds small categories.** It colors the seven biggest categories over the shown
  range and folds the rest into one gray `Решта`, since more hues stop being distinguishable. The
  colors are CSS variables in `web/src/index.css`, checked for color-blind separation and contrast
  in light and dark mode. A selected category or merchant replaces the stack with that one series.
- **Charts use Recharts.** Balance over time and Spending per month were first hand-drawn SVG, then
  rebuilt with three libraries to compare (commits `7b8880a`, `3aafd8a`, `d37e8c4`). Each kept the same
  behavior: per-segment tooltip, median line, usual range, month totals, click to select a category or
  pick a month. Bundle sizes are the minified main chunk, 520 kB (164 kB gzip) without any chart library.

  |                                         | [Recharts](https://recharts.org) 3                                        | [visx](https://airbnb.io/visx) 4        | [uPlot](https://github.com/leeoniya/uPlot) 1.6                      |
  | --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
  | Model                                   | React components that draw a whole chart                                  | d3 scales and shapes; you write the SVG | Imperative canvas, no React bindings                                |
  | Stacked bars, reference lines and areas | Built in (`stackId`, `ReferenceLine`, `ReferenceArea`)                    | `BarStack`; lines and areas by hand     | Not built in: running totals, labels and guides drawn on the canvas |
  | Tooltips, keyboard, hit testing         | Built in, custom tooltip content                                          | All by hand                             | All by hand, plus finding the segment under the cursor              |
  | Theme colors                            | CSS variables work in SVG attributes                                      | Same                                    | Canvas needs them resolved with `getComputedStyle`                  |
  | Bundle                                  | 906 kB (273 kB gzip)                                                      | 564 kB (181 kB gzip)                    | 572 kB (187 kB gzip)                                                |
  | Dependencies                            | Redux Toolkit, react-redux, immer, reselect (an internal store per chart) | d3 modules                              | None                                                                |

  Recharts won on the least chart code to own: the charts are declarations, not drawing and event
  code. Its costs: the largest bundle, the Redux dependencies (see recharts/recharts#6117 for the
  build issues they cause elsewhere; Vite builds it fine), segments are not tab stops (the chart is one
  stop and the arrow keys move between bars) and hovering one segment no longer dims the rest. Two
  workarounds live in the charts: a mouse click on the chart is kept from focusing it, which would
  otherwise draw a focus box and pin the tooltip to the first bar, and each month's total is drawn by a
  `LabelList` on the stack's topmost segment, read from the label's own entry because indexes go stale
  while the shown months change. visx is the fallback if the bundle starts to matter; uPlot pays off
  only for far bigger series than a year of days.

- **Median over complete months.** The chart's median leaves out the running month, which would
  pull it down, counts months without spending as zero when a category or merchant is selected, and
  covers only the months the period filter shows (every month for all time or a week).
  The median, not the average, so one big month barely moves it. Sending it to Runway goes through
  `web/src/lib/budget.ts`, which rebuilds the whole budget body because `PUT /budget` clears any
  field it is not given.
- **Shared package is types only.** `shared/index.d.ts` declares the response shapes (`Account`,
  `Transaction`, `Category`, `Budget`, `Goal`, `Rates`) and the `Currency`/`AccountKind` unions. The
  API types its response mappers with them and the web reads them, so a changed field fails to
  compile on both sides. Imports are type-only, so nothing is built or shipped: it is a dev
  dependency and the API image runs without it. Runtime lists (currencies, account kinds) stay in
  each app, checked with `AllOf<Union, typeof list>` so a missing or unknown member fails to compile.
- **Phone layout is the same components below Tailwind's `sm` breakpoint.** Layout differences are
  `sm:`/`max-sm:` classes; the one behavior that needs JavaScript, the chart showing one quarter,
  reads the same breakpoint from `web/src/lib/media.ts`. On a
  phone the chart's median still covers every complete month in the filter's scope, not only the
  quarter shown.
- **No router library.** The web app switches pages on `location.hash` (`#/`, `#/spending`,
  `#/transactions`, `#/plan`); a query after it carries page state, e.g. `#/transactions?account=3`
  opens that account and `?category=groceries&period=m:2026-11` filters it on load.
- **Web layout:** a folder per page in `web/src/pages/` (`balances`, `spending`, `transactions`, `plan`)
  holding the page and the parts only it uses; `components/` for parts several pages share; `lib/` for
  types, API calls, formatting and shared class names. `lib/finance.ts` is the hook the Balances,
  Spending and Plan pages share: it loads accounts, rates, the budget and, when asked, transactions,
  rate history and CPI, and does the currency and budget calculations.
- **Container queries for account rows.** They lay out by the accounts list's width rather than the
  screen's, so the same row fits the desktop sidebar and a phone.
- **Dev watcher ignores `data.db`.** `pnpm dev` restarts the API on file changes in `api/`; writes to
  the database are excluded so saving a category does not restart the server mid-request.

## TODO

- [x] Monobank sync: pull account balances from the [Monobank API](https://api.monobank.ua/docs/) with a personal token
- [x] Delete and rename accounts
- [x] Balance history over time
- [x] Goals in priority order (reach one after another instead of each on its own)
- [x] Shared package for types used by both `api` and `web`
- [x] Income and savings rate from transactions (Cash flow card)

### Missing statistics

- [x] This month against the usual: each category's spending vs its median («Продукти +34%»)
- [x] Recurring payments: detect subscriptions (same merchant, similar amount each month) and show the
      committed monthly total
- [x] Spread, not only the median: p25–p75 band or the worst month, since Runway assumes flat spending
- [x] Year-over-year: same month last year and yearly totals per category
- [x] Pace within the month: «spent X by the 14th, on track for Y»

### Missing financial concepts

- [x] Historical NBU rates, so the balance chart and cash flow show currency gains and losses
- [x] Inflation: real (inflation-adjusted) spending history and growing spending in runway and goal estimates
- [ ] Investments: track positions and value, count them in net worth, let goals assume a return
- [ ] Debts and loans: liabilities with interest, net worth as assets − liabilities
- [x] Emergency fund target: N months of essential spending (3–6 is the usual rule) with a status
- [x] Category budgets: a monthly cap per category and progress against it
- [ ] Taxes: set aside a ФОП's single tax and ЄСВ from income

### Tech debt

Deliberate shortcuts, each fine at today's size, with what would make it worth fixing:

- [ ] **Reports split between browser and API.** Spending per year is summed in the API; This month,
      Category budgets, Cash flow and Recurring still sum in the browser, so the Spending page loads every
      transaction (~1.4 MB, ~30 ms today). Move them one at a time if loading gets slow; Cash flow needs
      the daily rate history in the API.
- [ ] **Spending per year returns unused years.** Rows keep amounts for years outside `years`; the
      table ignores them.
- [ ] **Monobank statements are not paged** (`api/src/mono.ts`). A request caps at 500 items; page by
      `to` if a month ever exceeds that.
- [ ] **Rate history and CPI are cached in memory** (`api/src/routes/rates`, `api/src/routes/inflation`)
      and refetched after a restart; store them in a table if the NBU gets slow or rate-limits.
- [ ] **Merchant icons come from Google's favicon service** (`web/src/components/MerchantIcon.tsx`), so
      Google sees which merchant domains are shown; proxy them through the API if that matters.
- [ ] **Recurring payments detect monthly cycles only** (`web/src/pages/spending/Recurring.tsx`); yearly
      and weekly payments need their own period detection.

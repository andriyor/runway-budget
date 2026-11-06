# Runway Budget

Personal balance tracker for USD, EUR and UAH accounts. Totals are converted at the official
[National Bank of Ukraine](https://bank.gov.ua) rate, and it estimates how long your savings last
and when you reach your goals.

## Features

- **Accounts**: add cash or bank accounts in USD, EUR or UAH, update their balances, rename, reorder or delete them.
- **Totals**: all balances summed in each currency at the NBU rate of the day.
- **Runway**: enter monthly spending, an optional salary, an optional extreme-saving budget and an optional untouchable reserve, and see
  how many months your savings last with and without salary. Enter how many months you want to live
  without salary to see the most you can spend per month.
- **Goals**: set a target amount and see progress and the date you reach it at your current monthly
  surplus (salary minus spending). Months you want to live without salary are kept aside as a cushion
  and not counted toward goals.
- **Monobank sync**: pull the last month of one Monobank card's transactions and set the account
  balance from them.
- **Transactions page**:
  - a stacked chart of spending per month by category;
  - spending by category with a drill-down into subcategories;
  - spending by merchant;
  - filters by month or ISO week, category and merchant, all clickable from the charts;
  - sorting by date or amount and a note on any transaction.
- **Categories**: transactions are sorted into categories and subcategories automatically from their
  MCC. Correct one transaction or every transaction from a merchant, and mark transfers as income,
  moves between your own accounts or investments so they do not count as spending.

## Stack

pnpm workspace with two apps:

| Path   | What                                                                       |
| ------ | -------------------------------------------------------------------------- |
| `api/` | [Fastify](https://fastify.dev) + TypeScript, SQLite via [Drizzle ORM](https://orm.drizzle.team) and `better-sqlite3` |
| `web/` | React + TypeScript + [Vite](https://vite.dev), styled with [Tailwind CSS](https://tailwindcss.com) |

## Getting started

Requires Node.js 24 and pnpm.

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts the API on <http://localhost:3000> and the web app on <http://localhost:5173>.
The web dev server proxies `/api/*` to the API. The SQLite database `api/data.db` is created and
migrated on first start; set `DB_FILE` to use another path.

## Docker

```sh
docker compose up -d --build
```

Serves the app on <http://localhost:8080>. The SQLite database is kept in the `data` volume.
`api/.env` is passed to the API container when it exists.

## Monobank

Create a personal token at <https://api.monobank.ua> and put it in `api/.env` (git-ignored, loaded
by the API on start):

```sh
MONO_TOKEN=...
MONO_ACCOUNT=...   # card account id from /personal/client-info
```

Then press **Sync Monobank** on the Transactions page. It fetches the last 31 days; to fill in older
history, call the sync endpoint once per earlier 31-day window, a minute apart (Monobank's rate limit):

```sh
curl -X POST "localhost:3000/accounts/mono/sync?to=$(date -v-31d +%s)"
```

## Scripts

Run from the repository root:

| Command      | What                                  |
| ------------ | ------------------------------------- |
| `pnpm dev`   | Start API and web in watch mode       |
| `pnpm build` | Build both apps                       |
| `pnpm test`  | Type-check and run API tests (in-memory SQLite); does not touch `dist` |
| `pnpm lint`  | Lint the web app with oxlint          |

To work on one app: `pnpm --filter api dev` or `pnpm --filter web dev`.

## Database

The schema lives in `api/src/db/schema.ts`. After changing it, generate a migration:

```sh
pnpm --filter api db:generate
```

Migrations in `api/drizzle/` are applied automatically when the API starts. Money is stored in
integer minor units (cents/kopiykas).

## API

| Method   | Path            | What                                                  |
| -------- | --------------- | ----------------------------------------------------- |
| `GET`    | `/accounts`     | List accounts                                         |
| `GET`    | `/accounts/:id/transactions` | Transactions, newest first, with `merchant`, `category`, `categorySource`, `mccDescription`, `merchantDomain` and `note` |
| `GET`    | `/categories`   | Category tree `{ id, label, emoji, spending, subcategories: [{ id, label }] }` |
| `PUT`    | `/categories/merchants` | Set a merchant's category `{ description, category }`; `category: null` resets it |
| `PUT`    | `/categories/transactions/:id` | Set one transaction's category `{ category }`; `null` resets it |
| `PATCH`  | `/transactions/:id` | Set a transaction's note `{ note }`; empty or `null` clears it |
| `POST`   | `/accounts/mono/sync` | Import 31 days from Monobank ending at `?to=` (unix seconds, default now) |
| `POST`   | `/accounts`     | Create account `{ name, currency, balance, kind? }` (`bank` default or `cash`) |
| `PUT`    | `/accounts/order` | Reorder: `{ ids }` with every account id in order |
| `PATCH`  | `/accounts/:id` | Update any of `name`, `currency`, `balance`, `kind` |
| `DELETE` | `/accounts/:id` | Delete account                                        |
| `GET`    | `/budget`       | Monthly spend, salary and reserve, or `null`          |
| `PUT`    | `/budget`       | Set `{ monthlySpend, currency, salary?, salaryCurrency?, reserve?, reserveCurrency?, minimalSpend?, minimalSpendCurrency?, targetMonths? }` |
| `GET`    | `/goals`        | List goals                                            |
| `POST`   | `/goals`        | Create goal `{ name, target, currency }`              |
| `DELETE` | `/goals/:id`    | Delete goal                                           |
| `GET`    | `/rates`        | NBU rates as UAH per unit, cached for an hour         |

## How estimates work

- **Available savings** = total balance − untouchable reserve, converted at NBU rates.
- **Runway** = available savings ÷ monthly loss (spending, or spending − salary). A month is 30.44 days.
- **Goal ETA** = (target − available savings) ÷ monthly surplus. Each goal is measured on its own,
  as if the whole surplus goes to it.

Estimates assume flat spending and salary, and ignore interest and inflation.

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
- **A merchant is its normalized description.** The API returns `merchant` (lowercased, `Скасування. `
  stripped), the same key merchant overrides use, so the merchant summary, filter and corrections
  agree. Different spellings of one shop (`MOLLI 1`, `Molli`) stay separate merchants.
- **Merchant icons come from a hand-kept keyword map.** Monobank sends no logos, only a description
  such as `Apple` or `Сільпо`. `api/src/data/merchants.json` maps a domain to name fragments, matched
  case-insensitively on read; the web app shows that domain's favicon from Google's favicon service
  (which therefore sees the shown domains). Unmatched merchants show their category's emoji. Add a
  line to the map to cover a new shop.
- **Transactions are deleted with their account** via an `ON DELETE CASCADE` foreign key.
- **Summaries and filters run in the browser.** The page loads an account's whole transaction list
  and groups it by month, ISO week, category and merchant locally, so month and week boundaries use
  the viewer's time zone and switching filters needs no request. Move filtering to the API with
  `?from&to` once the history grows into several thousand transactions.
- **Monthly chart folds small categories.** It colors the seven biggest categories over the shown
  range and folds the rest into one gray `Решта`, since more hues stop being distinguishable. The
  colors are CSS variables in `web/src/index.css`, checked for color-blind separation and contrast
  in light and dark mode.
- **No router library.** The web app switches pages on `location.hash` (`#/`, `#/transactions`).
- **Web layout:** `web/src/pages/` for the two pages, `components/` for their parts, `lib/` for
  types, API calls, formatting and shared class names.
- **Dev watcher ignores `data.db`.** `pnpm dev` restarts the API on file changes in `api/`; writes to
  the database are excluded so saving a category does not restart the server mid-request.

## TODO

- [x] Monobank sync: pull account balances from the [Monobank API](https://api.monobank.ua/docs/) with a personal token
- [x] Delete and rename accounts
- [ ] Balance history over time
- [ ] Goals in priority order (reach one after another instead of each on its own)
- [ ] Shared package for types used by both `api` and `web`

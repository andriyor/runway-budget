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
- **Monobank sync**: pull the last month of one Monobank card's transactions, set the account balance
  from them, and browse them on the Transactions page grouped into spending categories you can correct per merchant.

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

Then press **Sync Monobank** on the Transactions page.

## Scripts

Run from the repository root:

| Command      | What                                  |
| ------------ | ------------------------------------- |
| `pnpm dev`   | Start API and web in watch mode       |
| `pnpm build` | Build both apps                       |
| `pnpm test`  | Run API tests (in-memory SQLite)      |
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
| `GET`    | `/accounts/:id/transactions` | Transactions, newest first, with `category`, `mccDescription` and `merchantDomain` |
| `GET`    | `/categories`   | Category tree `{ id, label, emoji, spending, subcategories: [{ id, label }] }` |
| `PUT`    | `/categories/merchants` | Set a merchant's category `{ description, category }`; `category: null` resets it |
| `PUT`    | `/categories/transactions/:id` | Set one transaction's category `{ category }`; `null` resets it |
| `POST`   | `/accounts/mono/sync` | Import 31 days from Monobank ending at `?to=` (unix seconds, default now) |
| `POST`   | `/accounts`     | Create account `{ name, currency, balance, kind? }` (`bank` default or `cash`) |
| `PUT`    | `/accounts/order` | Reorder: `{ ids }` with every account id in order |
| `PATCH`  | `/accounts/:id` | Update any of `name`, `currency`, `balance`, `kind` |
| `DELETE` | `/accounts/:id` | Delete account                                        |
| `GET`    | `/budget`       | Monthly spend, salary and reserve, or `null`          |
| `PUT`    | `/budget`       | Set `{ monthlySpend, currency, salary?, salaryCurrency?, reserve?, reserveCurrency?, minimalSpend?, minimalSpendCurrency? }` |
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
  subcategories: `Перекази` (spending), `Надходження` and `Між своїми рахунками` (not spending). MCC
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
- **Spending is net of refunds.** The summary sums each category's amounts, so a refund lowers the
  category it belongs to. `Надходження` and `Між своїми рахунками` are not spending and stay out.
- **Merchant icons come from a hand-kept keyword map.** Monobank sends no logos, only a description
  such as `Apple` or `Сільпо`. `api/src/data/merchants.json` maps a domain to name fragments, matched
  case-insensitively on read; the web app shows that domain's favicon from Google's favicon service
  (which therefore sees the shown domains). Unmatched merchants get a letter avatar. Add a line to
  the map to cover a new shop.
- **Transactions are deleted with their account** via an `ON DELETE CASCADE` foreign key.
- **No router library.** The web app switches pages on `location.hash` (`#/`, `#/transactions`).

## TODO

- [x] Monobank sync: pull account balances from the [Monobank API](https://api.monobank.ua/docs/) with a personal token
- [x] Delete and rename accounts
- [ ] Balance history over time
- [ ] Goals in priority order (reach one after another instead of each on its own)
- [ ] Shared package for types used by both `api` and `web`

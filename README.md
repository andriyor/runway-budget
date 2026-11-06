# oreh-money

Personal balance tracker for USD, EUR and UAH accounts. Totals are converted at the official
[National Bank of Ukraine](https://bank.gov.ua) rate, and it estimates how long your savings last
and when you reach your goals.

## Features

- **Accounts**: add accounts in USD, EUR or UAH and update their balances.
- **Totals**: all balances summed in each currency at the NBU rate of the day.
- **Runway**: enter monthly spending, an optional salary and an optional untouchable reserve, and see
  how many months your savings last with and without salary.
- **Goals**: set a target amount and see progress and the date you reach it at your current monthly
  surplus (salary minus spending).

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
| `POST`   | `/accounts`     | Create account `{ name, currency, balance }`          |
| `PATCH`  | `/accounts/:id` | Update any of `name`, `currency`, `balance`           |
| `GET`    | `/budget`       | Monthly spend, salary and reserve, or `null`          |
| `PUT`    | `/budget`       | Set `{ monthlySpend, currency, salary?, salaryCurrency?, reserve?, reserveCurrency? }` |
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

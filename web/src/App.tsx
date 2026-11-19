import { useEffect, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Nav } from './components/Nav'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { About } from './pages/About'
import { Balances } from './pages/balances/Balances'
import { Plan } from './pages/plan/Plan'
import { Spending } from './pages/spending/Spending'
import { Rules } from './pages/transactions/Rules'
import { TransactionsPage } from './pages/transactions/Transactions'

export default function App() {
  const [page, setPage] = useState(location.hash || '#/')
  useEffect(() => {
    const onHash = () => setPage(location.hash || '#/')
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // the part before ? picks the page; the query is the page's own state, e.g. #/transactions?account=3
  const path = page.split('?')[0]

  // Balances is wider on desktop for its accounts sidebar; the top bar keeps one width, so it does not jump
  return (
    <>
      {/* on phones Nav is the bottom bar, leaving the theme switcher alone at the top right */}
      <header className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 pt-6 sm:justify-between sm:pt-10">
        {/* Rules belongs to Transactions, so that tab stays current */}
        <Nav page={path === '#/rules' ? '#/transactions' : path} />
        <ThemeSwitcher />
      </header>
      <main
        className={`mx-auto flex ${path === '#/' ? 'max-w-7xl' : 'max-w-5xl'} flex-col gap-4 px-4 pt-4 pb-24 sm:gap-6 sm:pt-6 sm:pb-10`}
      >
        {/* keyed by page so switching pages clears an error */}
        <ErrorBoundary key={path}>
          {path === '#/transactions' ? (
            <TransactionsPage />
          ) : path === '#/rules' ? (
            <Rules />
          ) : path === '#/spending' ? (
            <Spending />
          ) : path === '#/plan' ? (
            <Plan />
          ) : path === '#/about' ? (
            <About />
          ) : (
            <Balances />
          )}
        </ErrorBoundary>
      </main>
    </>
  )
}

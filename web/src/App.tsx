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

  // Balances is wider on desktop for its accounts sidebar
  return (
    <main
      className={`mx-auto flex ${path === '#/' ? 'max-w-7xl' : 'max-w-5xl'} flex-col gap-4 px-4 pt-6 pb-24 sm:gap-6 sm:py-10`}
    >
      {/* Rules belongs to Transactions, so that tab stays current */}
      {/* on phones Nav is the bottom bar, leaving the theme switcher alone at the top right */}
      <div className="flex items-center justify-end gap-2 sm:justify-between">
        <Nav page={path === '#/rules' ? '#/transactions' : path} />
        <ThemeSwitcher />
      </div>
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
  )
}

import { useEffect, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Nav } from './components/Nav'
import { Balances } from './pages/Balances'
import { Plan } from './pages/Plan'
import { Spending } from './pages/Spending'
import { TransactionsPage } from './pages/Transactions'

export default function App() {
  const [page, setPage] = useState(location.hash || '#/')
  useEffect(() => {
    const onHash = () => setPage(location.hash || '#/')
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // the part before ? picks the page; the query is the page's own state, e.g. #/transactions?account=3
  const path = page.split('?')[0]

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-6 pb-24 sm:gap-6 sm:py-10">
      <Nav page={path} />
      {/* keyed by page so switching pages clears an error */}
      <ErrorBoundary key={path}>
        {path === '#/transactions' ? <TransactionsPage /> : path === '#/spending' ? <Spending /> : path === '#/plan' ? <Plan /> : <Balances />}
      </ErrorBoundary>
    </main>
  )
}

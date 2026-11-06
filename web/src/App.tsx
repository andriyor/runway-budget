import { useEffect, useState } from 'react'
import { Nav } from './components/Nav'
import { Balances } from './pages/Balances'
import { TransactionsPage } from './pages/Transactions'

export default function App() {
  const [page, setPage] = useState(location.hash || '#/')
  useEffect(() => {
    const onHash = () => setPage(location.hash || '#/')
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <Nav page={page} />
      {page === '#/transactions' ? <TransactionsPage /> : <Balances />}
    </main>
  )
}

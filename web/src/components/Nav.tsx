import type { ReactNode } from 'react'
import { ListIcon, WalletIcon } from './icons'

// Phones: a fixed bottom tab bar with icons, within thumb reach and always visible.
// From sm up: the pills at the top of the page.
export function Nav({ page }: { page: string }) {
  const link = (href: string, label: string, icon: ReactNode) => (
    <a
      href={href}
      aria-current={page === href ? 'page' : undefined}
      className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-zinc-500 aria-[current=page]:text-indigo-600 sm:flex-none sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm sm:text-zinc-600 sm:hover:bg-zinc-100 sm:aria-[current=page]:bg-zinc-900 sm:aria-[current=page]:text-white dark:text-zinc-400 dark:aria-[current=page]:text-indigo-400 sm:dark:text-zinc-300 sm:dark:hover:bg-zinc-800 sm:dark:aria-[current=page]:bg-zinc-100 sm:dark:aria-[current=page]:text-zinc-900"
    >
      <span className="sm:hidden">{icon}</span>
      {label}
    </a>
  )
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:z-auto sm:gap-2 sm:border-0 sm:bg-transparent sm:pb-0 sm:backdrop-blur-none dark:border-zinc-800 dark:bg-zinc-900/90 sm:dark:bg-transparent">
      {link('#/', 'Balances', <WalletIcon />)}
      {link('#/transactions', 'Transactions', <ListIcon />)}
    </nav>
  )
}

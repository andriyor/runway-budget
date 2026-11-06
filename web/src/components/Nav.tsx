export function Nav({ page }: { page: string }) {
  const link = (href: string, label: string) => (
    <a
      href={href}
      aria-current={page === href ? 'page' : undefined}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 aria-[current=page]:bg-zinc-900 aria-[current=page]:text-white dark:text-zinc-300 dark:hover:bg-zinc-800 dark:aria-[current=page]:bg-zinc-100 dark:aria-[current=page]:text-zinc-900"
    >
      {label}
    </a>
  )
  return <nav className="flex gap-2">{link('#/', 'Balances')}{link('#/transactions', 'Transactions')}</nav>
}

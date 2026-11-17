// a page's load or save error, above its cards
export function ErrorBanner({ children }: { children: string }) {
  return children ? (
    <p
      role="alert"
      className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900"
    >
      {children}
    </p>
  ) : null
}

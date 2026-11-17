export function ErrorText({ children }: { children: string }) {
  return children ? (
    <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
      {children}
    </p>
  ) : null
}

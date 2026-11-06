import { useState } from 'react'

// ponytail: favicons via Google's public service, so it sees which merchant domains are shown; proxy through the API if that matters
export function MerchantIcon({ domain, emoji }: { domain: string | null, emoji: string }) {
  const [failed, setFailed] = useState(false)
  if (domain && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        onError={() => setFailed(true)}
        className="size-9 shrink-0 rounded-full bg-white object-contain p-1.5 ring-1 ring-zinc-200 dark:ring-zinc-700"
      />
    )
  }
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg dark:bg-zinc-800">
      {emoji}
    </span>
  )
}

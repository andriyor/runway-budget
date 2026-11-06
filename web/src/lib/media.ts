import { useSyncExternalStore } from 'react'

// below Tailwind's sm breakpoint
export const PHONE = '(max-width: 639px)'

const subscribe = (onChange: () => void) => {
  const query = matchMedia(PHONE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

// true on phone-sized screens; updates on rotate or resize
export const usePhone = () => useSyncExternalStore(subscribe, () => matchMedia(PHONE).matches)

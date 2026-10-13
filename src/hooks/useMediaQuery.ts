import { useSyncExternalStore } from 'react'

/** Live `matchMedia` result, e.g. useMediaQuery('(min-width: 768px)'). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind breakpoints used for the mobile layout (md = 768px is the phone/desktop split). */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)')
export const useIsLarge = () => useMediaQuery('(min-width: 1024px)')
export const useIsXL = () => useMediaQuery('(min-width: 1280px)')

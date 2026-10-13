/** Deterministic PRNG so the mock data is stable between reloads. */
export function createRandom(seed: number) {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  }
}

const DAY = 24 * 60 * 60 * 1000

/** Start of today (local) offset by `days`, at the given hour. */
export function daysFromToday(days: number, hour = 12): string {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return new Date(d.getTime() + days * DAY).toISOString()
}

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

/** Simple gradient avatar as a data URI, used for clients that have a "photo". */
export function gradientAvatar(a: string, b: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="40" height="40" fill="url(#g)"/><circle cx="20" cy="16" r="7" fill="rgba(255,255,255,0.55)"/><path d="M6 40c2-9 8-13 14-13s12 4 14 13z" fill="rgba(255,255,255,0.45)"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge about the custom font-size tokens so `text-2xs` / `text-md`
// are not mistaken for text colors (and vice versa).
const merge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['2xs', 'md'] }] } },
})

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function formatCount(n: number, max = 999) {
  return n > max ? `${max}+` : String(n)
}

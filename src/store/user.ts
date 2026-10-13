import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as api from '@/services'
import type { User } from '@/types'

export type Theme = 'dark' | 'light'

interface UserState {
  user: User | null
  load: () => Promise<void>
  updateProfile: (patch: Partial<Pick<User, 'name' | 'avatarUrl'>>) => Promise<void>
}

export const useUser = create<UserState>((set, get) => ({
  user: null,
  load: async () => {
    if (get().user) return
    set({ user: await api.getCurrentUser() })
  },
  updateProfile: async (patch) => {
    set({ user: await api.updateCurrentUser(patch) })
  },
}))

interface ThemeState {
  theme: Theme
  toggle: () => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'theme-store',
      onRehydrateStorage: () => (state) => state && applyTheme(state.theme),
    },
  ),
)

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('theme', theme)
  } catch {
    /* storage unavailable */
  }
}

useTheme.subscribe((s) => applyTheme(s.theme))

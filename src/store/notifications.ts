import { create } from 'zustand'
import * as api from '@/services'
import type { Notification } from '@/types'

interface NotificationsState {
  loaded: boolean
  items: Notification[]
  open: boolean
  setOpen: (open: boolean) => void
  load: () => Promise<void>
  add: (n: Notification) => void
  markSeen: (id: string) => void
  markAllSeen: () => void
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  loaded: false,
  items: [],
  open: false,
  setOpen: (open) => set({ open }),
  load: async () => {
    if (get().loaded) return
    const items = await api.getNotifications()
    set({ items, loaded: true })
  },
  add: (n) => set((s) => ({ items: [n, ...s.items.filter((x) => x.id !== n.id)] })),
  markSeen: (id) => {
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, seen: true } : n)) }))
    void api.markNotificationsSeen([id])
  },
  markAllSeen: () => {
    const ids = get().items.filter((n) => !n.seen).map((n) => n.id)
    set((s) => ({ items: s.items.map((n) => ({ ...n, seen: true })) }))
    void api.markNotificationsSeen(ids)
  },
}))

export const selectUnseenCount = (s: NotificationsState) => s.items.reduce((acc, n) => acc + (n.seen ? 0 : 1), 0)

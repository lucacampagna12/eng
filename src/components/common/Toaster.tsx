import { CircleCheck } from 'lucide-react'
import { create } from 'zustand'

interface Toast {
  id: number
  message: string
}

const useToasts = create<{ toasts: Toast[] }>(() => ({ toasts: [] }))

let nextId = 1
export function toast(message: string) {
  const id = nextId++
  useToasts.setState((s) => ({ toasts: [...s.toasts, { id, message }] }))
  setTimeout(() => useToasts.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600)
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col items-end gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-popover"
        >
          <CircleCheck className="size-4 text-chip-green-fg" />
          {t.message}
        </div>
      ))}
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'
import * as React from 'react'
import { cn, initials } from '@/lib/utils'
import type { ProjectStatus } from '@/types'

// ---------- Avatar ----------
export function Avatar({
  name,
  src,
  size = 20,
  className,
  variant = 'muted',
}: {
  name: string
  src?: string
  size?: number
  className?: string
  variant?: 'muted' | 'solid'
}) {
  const style = { width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.4)) }
  if (src) {
    return <img src={src} alt={name} style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <span
      style={style}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none',
        variant === 'solid' ? 'bg-primary text-primary-foreground' : 'bg-elevated-hover text-foreground',
        className,
      )}
      aria-label={name}
    >
      {initials(name)}
    </span>
  )
}

// ---------- Status ----------
export const STATUS_COLORS: Record<ProjectStatus, string> = {
  New: '#a3a3a3',
  'In Progress': '#60a5fa',
  'In Review': '#c084fc',
  'Changes Requested': '#fb923c',
  Approved: '#facc15',
  'Final Video Accepted': '#34d399',
}

export function StatusDot({ status, className }: { status: ProjectStatus; className?: string }) {
  return <span className={cn('size-1.5 shrink-0 rounded-full', className)} style={{ background: STATUS_COLORS[status] }} />
}

// ---------- Empty state ----------
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      {Icon && <Icon className="mb-3 size-5 text-muted-foreground" strokeWidth={1.75} />}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-[180px] text-xs leading-5 text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

// ---------- Panel (card surface used across the app) ----------
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-surface', className)} {...props} />
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-10 shrink-0 items-center gap-3 border-b border-border bg-background px-2">
      <h1 className="text-base font-semibold">{title}</h1>
      {children}
    </header>
  )
}

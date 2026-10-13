import { ChevronDown, ChevronRight, Upload } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Upload as UploadState } from './useUploads'

/** "Media ⌄" style header. `level="sub"` is the smaller, indented "Videos ⌄ (2)" variant. */
export function SectionHeader({
  title,
  count,
  open,
  onToggle,
  level = 'section',
  action,
}: {
  title: string
  count?: number
  open: boolean
  onToggle: () => void
  level?: 'section' | 'sub'
  action?: React.ReactNode
}) {
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <div className="flex h-8 items-center justify-between gap-3">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'group -ml-1 flex items-center gap-2 rounded-md px-1 py-0.5 font-semibold transition-colors duration-150 hover:bg-hover',
          level === 'section' ? 'text-base' : 'text-sm',
        )}
      >
        {title}
        <Chevron className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        {count !== undefined && <span className="text-xs font-normal text-muted-foreground">({count})</span>}
      </button>
      {action}
    </div>
  )
}

export function UploadButton({ onClick, label = 'Upload' }: { onClick: () => void; label?: string }) {
  return (
    <Button size="sm" onClick={onClick} className="h-7 rounded-lg">
      <Upload /> {label}
    </Button>
  )
}

/** Wraps a section so files can be dropped anywhere on it. */
export function DropArea({
  onFiles,
  hint,
  className,
  children,
}: {
  onFiles: (files: File[]) => void
  hint: string
  className?: string
  children: React.ReactNode
}) {
  const [over, setOver] = React.useState(false)
  const depth = React.useRef(0)
  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes('Files')

  return (
    <div
      className={cn('relative', className)}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        depth.current += 1
        setOver(true)
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setOver(false)
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        depth.current = 0
        setOver(false)
        onFiles(Array.from(e.dataTransfer.files))
      }}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute -inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-subtle-foreground bg-background/80 text-sm font-medium text-foreground">
          {hint}
        </div>
      )}
    </div>
  )
}

export function EmptyDropZone({ onBrowse, title, accept }: { onBrowse: () => void; title: string; accept: string }) {
  return (
    <button
      onClick={onBrowse}
      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong px-4 py-7 text-center transition-colors duration-150 hover:border-subtle-foreground hover:bg-hover"
    >
      <Upload className="size-4 text-muted-foreground" strokeWidth={1.75} />
      <span className="text-sm font-medium">{title}</span>
      <span className="text-2xs text-muted-foreground">Drag and drop or click to browse · {accept}</span>
    </button>
  )
}

export function UploadProgressList({ uploads }: { uploads: UploadState[] }) {
  if (uploads.length === 0) return null
  return (
    <ul className="mt-2 flex flex-col gap-1.5" aria-live="polite">
      {uploads.map((u) => (
        <li key={u.id} className="flex items-center gap-3 rounded-lg border border-border bg-elevated px-3 py-2">
          <span className="w-28 truncate text-xs font-medium sm:w-56">{u.name}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className={cn('h-full rounded-full transition-[width] duration-200', u.error ? 'bg-danger' : 'bg-foreground')}
              style={{ width: `${Math.round(u.progress * 100)}%` }}
            />
          </div>
          <span className={cn('w-20 text-right text-2xs tabular-nums', u.error ? 'text-danger' : 'text-muted-foreground')}>
            {u.error ?? (u.stage === 'processing' ? 'Processing…' : `${Math.round(u.progress * 100)}%`)}
          </span>
        </li>
      ))}
    </ul>
  )
}

import { format } from 'date-fns'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Copy, ExternalLink, FileText, Link2 } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, StatusDot } from '@/components/common'
import { MediaPeekButton, MediaThumb } from '@/components/common/MediaPreview'
import { toast } from '@/components/common/Toaster'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/misc'
import { SelectMenu } from '@/components/ui/select-menu'
import { approvalLink, approverName, sameApprover } from '@/lib/approvals'
import { formatDuration } from '@/lib/media'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { useUser } from '@/store/user'
import { PROJECT_STATUSES, type Approval, type ApprovalScope, type ApproverRef, type MediaItem, type Project, type ProjectStatus } from '@/types'

type Step = 'form' | 'review' | 'done'

const SCOPES: { value: ApprovalScope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'content', label: 'Content' },
  { value: 'media', label: 'Media' },
]

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('mb-2 text-[13px] font-semibold', className)}>{children}</h3>
}

/** Multi-step "Create Approval Workflow": pick what to review → approvers (ordered) → review → shareable link. */
export function CreateApprovalWorkflow({ project, onClose }: { project: Project; onClose: () => void }) {
  const navigate = useNavigate()
  const { media, users, clients, createApproval } = useData()
  const me = useUser((s) => s.user)
  const files = media.filter((m) => m.projectId === project.id)
  const client = byId(clients, project.clientId)

  const [step, setStep] = React.useState<Step>('form')
  const [scope, setScope] = React.useState<ApprovalScope>('all')
  const [includeContent, setIncludeContent] = React.useState(true)
  const [mediaIds, setMediaIds] = React.useState<string[]>([])
  const [approvers, setApprovers] = React.useState<ApproverRef[]>([])
  const [statusAfter, setStatusAfter] = React.useState<ProjectStatus>('Approved')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [created, setCreated] = React.useState<Approval>()

  const showContent = scope !== 'media'
  const showMedia = scope !== 'content'
  const content = scope === 'content' ? true : showContent && includeContent
  const selectedMedia = showMedia ? mediaIds : []
  const hasItems = content || selectedMedia.length > 0
  const valid = hasItems && approvers.length > 0

  const toggleMedia = (id: string) => setMediaIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const toggleApprover = (ref: ApproverRef) =>
    setApprovers((list) => (list.some((a) => sameApprover(a, ref)) ? list.filter((a) => !sameApprover(a, ref)) : [...list, ref]))
  const move = (index: number, delta: number) =>
    setApprovers((list) => {
      const next = [...list]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })

  const submit = async () => {
    if (!me || !valid) return
    setSaving(true)
    const approval = await createApproval({
      projectId: project.id,
      scope,
      includeContent: content,
      mediaIds: selectedMedia,
      requestedBy: me.id,
      approvers,
      statusAfterApproval: statusAfter,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    })
    setSaving(false)
    setCreated(approval)
    setStep('done')
  }

  const nameOf = (ref: ApproverRef) => approverName(ref, users, clients)

  // ---------- Step 3: created ----------
  if (step === 'done' && created) return <CreatedStep approval={created} onOpen={() => navigate(`/approvals/${created.id}`)} onClose={onClose} />

  // ---------- Step 2: review ----------
  if (step === 'review') {
    const reviewMedia = files.filter((f) => selectedMedia.includes(f.id))
    return (
      <>
        <DialogTitle className="text-lg">Review Approval</DialogTitle>
        <DialogDescription>Review your approval settings before submitting</DialogDescription>

        <SectionLabel className="mt-6">Items for Approval</SectionLabel>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-sunken p-3">
          {content && (
            <ReviewGroup title="Content" summary="Project Overview">
              <div className="flex h-12 items-center gap-3 rounded-lg border border-border bg-surface px-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold">Project Overview</span>
                  <span className="block text-2xs text-muted-foreground">Script and project fields</span>
                </span>
              </div>
            </ReviewGroup>
          )}
          {reviewMedia.length > 0 && (
            <ReviewGroup title="Media" summary={`${reviewMedia.length} item${reviewMedia.length === 1 ? '' : 's'} selected`}>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {reviewMedia.map((f) => (
                  <MediaTile key={f.id} item={f} />
                ))}
              </div>
            </ReviewGroup>
          )}
        </div>

        <SectionLabel className="mt-5">Approval Order</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {approvers.map((ref, i) => (
            <span
              key={`${ref.kind}-${ref.id}`}
              className="flex h-[30px] items-center gap-1.5 rounded-lg border border-accent/50 bg-accent-soft pr-2.5 pl-1.5 text-xs font-semibold"
            >
              <OrderNumber n={i + 1} />
              <Avatar name={nameOf(ref)} src={ref.kind === 'client' ? client?.avatarUrl : undefined} size={18} className="text-[8px]" />
              {nameOf(ref)}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <SectionLabel>Status After Approval</SectionLabel>
            <ReadOnlyField>
              <StatusDot status={statusAfter} /> {statusAfter}
            </ReadOnlyField>
          </div>
          <div>
            <SectionLabel>Expires At</SectionLabel>
            <ReadOnlyField>
              <CalendarDays className="size-3.5 text-muted-foreground" />
              {expiresAt ? format(new Date(expiresAt), 'dd/MM/yyyy HH:mm') : 'No expiration'}
            </ReadOnlyField>
          </div>
        </div>

        <Footer>
          <Button size="md" onClick={() => setStep('form')}>
            Back
          </Button>
          <Button size="md" variant="primary" onClick={submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create Approval'}
          </Button>
        </Footer>
      </>
    )
  }

  // ---------- Step 1: form ----------
  return (
    <>
      <DialogTitle className="text-lg">Create Approval Workflow</DialogTitle>
      <DialogDescription>Select approvers and arrange them in order</DialogDescription>

      <SectionLabel className="mt-6">What needs approval?</SectionLabel>
      <div role="radiogroup" className="grid grid-cols-3 gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            role="radio"
            aria-checked={scope === s.value}
            onClick={() => setScope(s.value)}
            className={cn(
              'h-8 rounded-lg border text-[13px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
              scope === s.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface-sunken text-foreground hover:border-border-strong hover:bg-hover',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {showContent && (
        <>
          <SectionLabel className="mt-5">Content Approval</SectionLabel>
          <button
            onClick={() => scope !== 'content' && setIncludeContent((v) => !v)}
            aria-pressed={content}
            className={cn(
              'flex h-14 w-full items-center gap-3 rounded-lg border px-3 text-left transition-colors duration-150',
              content ? 'border-accent/50 bg-accent-soft' : 'border-border bg-surface-sunken hover:border-border-strong',
            )}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
                content ? 'bg-primary text-primary-foreground' : 'bg-elevated-hover text-muted-foreground',
              )}
            >
              {content ? <Check className="size-4" strokeWidth={2.5} /> : <FileText className="size-4" />}
            </span>
            <span>
              <span className="block text-[13px] font-semibold">Project Overview</span>
              <span className="block text-2xs text-muted-foreground">Content ready for approval</span>
            </span>
          </button>
        </>
      )}

      {showMedia && (
        <>
          <SectionLabel className="mt-5">Select Media Items</SectionLabel>
          {files.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-strong px-4 py-5 text-center text-xs text-muted-foreground">
              This project has no media yet. Upload files in the Media section first.
            </p>
          ) : (
            <>
              <div className="grid max-h-[232px] grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-5">
                {files.map((f) => (
                  <MediaTile key={f.id} item={f} selected={mediaIds.includes(f.id)} onToggle={() => toggleMedia(f.id)} />
                ))}
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {mediaIds.length} item{mediaIds.length === 1 ? '' : 's'} selected
              </p>
            </>
          )}
        </>
      )}

      <SectionLabel className="mt-4">Team Approvers</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {users.map((u) => (
          <ApproverChip
            key={u.id}
            name={u.name}
            src={u.avatarUrl}
            order={approvers.findIndex((a) => sameApprover(a, { kind: 'user', id: u.id }))}
            onClick={() => toggleApprover({ kind: 'user', id: u.id })}
          />
        ))}
      </div>

      {client && (
        <>
          <SectionLabel className="mt-4">Client Approvers</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <ApproverChip
              name={client.name}
              src={client.avatarUrl}
              order={approvers.findIndex((a) => sameApprover(a, { kind: 'client', id: client.id }))}
              onClick={() => toggleApprover({ kind: 'client', id: client.id })}
            />
          </div>
        </>
      )}

      <SectionLabel className="mt-4">Approval Order</SectionLabel>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-sunken p-2">
        {approvers.length === 0 ? (
          <p className="px-1.5 text-xs text-subtle-foreground">Select team or client approvers. They'll review in this order.</p>
        ) : (
          approvers.map((ref, i) => (
            <span
              key={`${ref.kind}-${ref.id}`}
              className="flex h-[30px] items-center gap-1 rounded-lg border border-border-strong bg-surface pr-2.5 pl-1 text-xs font-semibold"
            >
              <OrderButton label={`Move ${nameOf(ref)} earlier`} disabled={i === 0} onClick={() => move(i, -1)} icon={ChevronLeft} />
              <OrderButton label={`Move ${nameOf(ref)} later`} disabled={i === approvers.length - 1} onClick={() => move(i, 1)} icon={ChevronRight} />
              <OrderNumber n={i + 1} className="ml-0.5" />
              <Avatar name={nameOf(ref)} src={ref.kind === 'client' ? client?.avatarUrl : undefined} size={18} className="ml-0.5 text-[8px]" />
              <span className="ml-0.5">{nameOf(ref)}</span>
            </span>
          ))
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <SectionLabel>Status After Approval</SectionLabel>
          <SelectMenu
            value={statusAfter}
            onChange={(v) => setStatusAfter(v as ProjectStatus)}
            className="h-9 rounded-lg bg-surface-sunken font-semibold"
            options={PROJECT_STATUSES.map((s) => ({ value: s, label: s, prefix: <StatusDot status={s} /> }))}
          />
        </div>
        <div>
          <SectionLabel>Expires At</SectionLabel>
          <input
            type="datetime-local"
            value={expiresAt}
            min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) => setExpiresAt(e.target.value)}
            aria-label="Expires at"
            className="h-9 w-full rounded-lg border border-border bg-surface-sunken px-3 text-sm font-semibold text-foreground outline-none [color-scheme:dark] hover:border-border-strong focus:border-subtle-foreground [:root:not(.dark)_&]:[color-scheme:light]"
          />
        </div>
      </div>

      <Footer>
        <Button size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="md"
          variant="primary"
          disabled={!valid}
          onClick={() => setStep('review')}
          title={valid ? undefined : 'Pick at least one item and one approver'}
          className="disabled:bg-elevated-hover disabled:text-muted-foreground disabled:opacity-100"
        >
          Review
        </Button>
      </Footer>
    </>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">{children}</div>
}

function OrderButton({ label, onClick, disabled, icon: Icon }: { label: string; onClick: () => void; disabled?: boolean; icon: typeof ChevronLeft }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-hover hover:text-foreground disabled:opacity-30"
    >
      <Icon className="size-3.5" />
    </button>
  )
}

function OrderNumber({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn('flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground', className)}>
      {n}
    </span>
  )
}

function ApproverChip({ name, src, order, onClick }: { name: string; src?: string; order: number; onClick: () => void }) {
  const on = order >= 0
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'flex h-[26px] items-center gap-1.5 rounded-lg border pr-2.5 pl-1.5 text-xs font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        on ? 'border-accent/60 bg-accent-soft' : 'border-border bg-surface-sunken hover:border-border-strong hover:bg-hover',
      )}
    >
      {on && <Check className="size-3 text-accent" strokeWidth={3} />}
      <Avatar name={name} src={src} size={18} className="text-[8px]" />
      {name}
    </button>
  )
}

/** Media tile used in both steps: selectable in the form, read-only in the review. Eye = floating preview. */
function MediaTile({ item, selected, onToggle }: { item: MediaItem; selected?: boolean; onToggle?: () => void }) {
  const interactive = !!onToggle
  return (
    <div
      role={interactive ? 'checkbox' : undefined}
      aria-checked={interactive ? selected : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onToggle}
      onKeyDown={interactive ? (e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), onToggle()) : undefined}
      className={cn(
        'group relative overflow-hidden rounded-lg border-2 bg-surface-sunken transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        interactive && 'cursor-pointer',
        selected ? 'border-primary' : 'border-border',
        interactive && !selected && 'hover:border-border-strong',
      )}
    >
      <div className="relative h-[74px] overflow-hidden">
        <MediaThumb item={item} />
        {item.kind !== 'image' && item.durationSec !== undefined && (
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">{formatDuration(item.durationSec)}</span>
        )}
        {selected && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="flex size-7 items-center justify-center rounded-full bg-white text-black">
              <Check className="size-4" strokeWidth={3} />
            </span>
          </span>
        )}
        <MediaPeekButton item={item} className="absolute top-1 right-1" />
      </div>
      <p className="truncate px-1.5 py-1 text-[11px] font-semibold" title={item.name}>
        {item.name}
      </p>
    </div>
  )
}

function ReviewGroup({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true)
  return (
    <section>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex h-8 w-full items-center gap-2 rounded-md px-1 text-left">
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-150', !open && '-rotate-90')} />
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="ml-auto text-2xs text-muted-foreground">{summary}</span>
      </button>
      {open && <div className="mt-1.5 mb-1">{children}</div>}
    </section>
  )
}

function ReadOnlyField({ children }: { children: React.ReactNode }) {
  return <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 text-[13px] font-semibold">{children}</div>
}

function CreatedStep({ approval, onOpen, onClose }: { approval: Approval; onOpen: () => void; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false)
  const link = approvalLink(approval.id)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      /* clipboard unavailable: the input stays selectable */
    }
    setCopied(true)
    toast('Approval link copied')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <CircleCheck className="size-6" />
      </span>
      <DialogTitle className="mt-3 text-lg">Approval created</DialogTitle>
      <DialogDescription>Share this link with the approvers. They'll see the files, can leave comments, draw on frames and mark timestamps.</DialogDescription>
      <div className="mt-5 flex w-full gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle-foreground" />
          <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Approval link" className="h-9 pl-8 text-xs" />
        </div>
        <Button size="md" variant="primary" onClick={copy} className="h-9 w-[112px]">
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </div>
      <div className="mt-5 flex w-full justify-end gap-2 border-t border-border pt-4">
        <Button size="md" onClick={onClose}>
          Done
        </Button>
        <Button size="md" onClick={onOpen}>
          <ExternalLink /> Open review
        </Button>
      </div>
    </div>
  )
}

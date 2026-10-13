import { format, formatDistanceToNow } from 'date-fns'
import {
  Check,
  CircleAlert,
  Clock,
  Download,
  FileText,
  Info,
  MessageCircle,
  Paperclip,
  Pencil,
  SendHorizontal,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { Avatar, EmptyState, StatusDot } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Hint } from '@/components/ui/misc'
import { approverName, APPROVAL_STATUS_LABEL, currentApprover, sameApprover, type ReviewItem } from '@/lib/approvals'
import { formatBytes, formatDuration } from '@/lib/media'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { useUser } from '@/store/user'
import type { Approval, ApprovalComment, DrawingStroke, Project } from '@/types'

type Tab = 'comments' | 'data'

export interface ComposerDraft {
  timestampSec?: number
  strokes: DrawingStroke[]
}

export function ReviewPanel({
  approval,
  project,
  items,
  currentItem,
  itemFocus,
  onClearFocus,
  comments,
  onShowComment,
  draft,
  onDraftChange,
  drawMode,
  onToggleDraw,
  getTime,
  canDecide,
  onDecide,
  expired,
}: {
  approval: Approval
  project?: Project
  items: ReviewItem[]
  currentItem?: ReviewItem
  itemFocus: boolean
  onClearFocus: () => void
  comments: ApprovalComment[]
  onShowComment: (c: ApprovalComment) => void
  draft: ComposerDraft
  onDraftChange: (d: ComposerDraft) => void
  drawMode: boolean
  onToggleDraw: () => void
  getTime: () => number | undefined
  canDecide: boolean
  onDecide: (d: 'approved' | 'changes_requested') => void
  expired: boolean
}) {
  const [tab, setTab] = React.useState<Tab>('comments')
  const isTimed = itemFocus && currentItem?.kind === 'media' && currentItem.media.kind !== 'image'
  const isVisual = itemFocus && currentItem?.kind === 'media' && currentItem.media.kind !== 'audio'

  return (
    <aside className="flex min-h-0 w-full flex-1 flex-col border-t border-border bg-surface md:w-[318px] md:flex-none md:shrink-0 md:border-t-0 md:border-l">
      <div role="tablist" className="grid h-[38px] shrink-0 grid-cols-2 border-b border-border">
        {(
          [
            ['comments', 'Comments'],
            ['data', 'Approval Data'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'relative text-xs font-semibold transition-colors duration-150',
              tab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
            {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      {tab === 'comments' ? (
        <>
          {itemFocus && currentItem && (
            <div className="flex shrink-0 items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">You're commenting on this item:</p>
                <p className="truncate text-[13px] text-muted-foreground">{currentItem.name}</p>
              </div>
              <Hint label="Comment on the whole approval instead" side="left">
                <button onClick={onClearFocus} aria-label="Stop commenting on this item" className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </Hint>
            </div>
          )}
          <CommentList comments={comments} onShowComment={onShowComment} />
          <Composer
            approvalId={approval.id}
            itemId={itemFocus ? currentItem?.key : undefined}
            draft={draft}
            onDraftChange={onDraftChange}
            canTimestamp={isTimed}
            canDraw={isVisual}
            drawMode={drawMode}
            onToggleDraw={onToggleDraw}
            getTime={getTime}
          />
        </>
      ) : (
        <ApprovalData approval={approval} project={project} items={items} canDecide={canDecide} onDecide={onDecide} expired={expired} />
      )}
    </aside>
  )
}

// ---------- Comments ----------

function CommentList({ comments, onShowComment }: { comments: ApprovalComment[]; onShowComment: (c: ApprovalComment) => void }) {
  const { users, deleteApprovalComment } = useData()
  const me = useUser((s) => s.user)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [comments.length])

  if (comments.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No messages yet"
        description="Leave the first comment"
        className="min-h-0 flex-1 [&>p:first-of-type]:text-[18px] [&>p:first-of-type]:leading-7 [&>p:first-of-type]:font-normal [&>p:last-of-type]:text-[13px] [&>svg]:size-10"
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <ul className="flex flex-col gap-1">
        {comments.map((c) => {
          const author = byId(users, c.authorId)
          const hasDrawing = !!c.drawing?.length
          return (
            <li key={c.id} className="group rounded-lg px-2 py-2.5 transition-colors hover:bg-hover">
              <div className="flex items-center gap-2">
                <Avatar name={author?.name ?? '?'} src={author?.avatarUrl} size={24} />
                <span className="truncate text-[13px] font-semibold">{author?.name ?? 'Someone'}</span>
                <span className="text-2xs text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                {c.authorId === me?.id && (
                  <button
                    onClick={() => deleteApprovalComment(c.id)}
                    aria-label="Delete comment"
                    className="ml-auto text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-1.5 pl-8">
                {(c.timestampSec !== undefined || hasDrawing) && (
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {c.timestampSec !== undefined && (
                      <button
                        onClick={() => onShowComment(c)}
                        className="inline-flex h-5 items-center gap-1 rounded-md bg-accent-soft px-1.5 text-2xs font-semibold text-accent transition-colors hover:bg-accent/20"
                      >
                        <Clock className="size-3" /> {formatDuration(c.timestampSec)}
                      </button>
                    )}
                    {hasDrawing && (
                      <button
                        onClick={() => onShowComment(c)}
                        className="inline-flex h-5 items-center gap-1 rounded-md bg-elevated-hover px-1.5 text-2xs font-semibold text-foreground transition-colors hover:bg-active"
                      >
                        <Pencil className="size-3" /> View drawing
                      </button>
                    )}
                  </div>
                )}
                {c.body && <p className="text-[13px] leading-5 break-words whitespace-pre-wrap">{c.body}</p>}
                {c.attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {c.attachments.map((a) =>
                      a.mimeType.startsWith('image/') ? (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border">
                          <img src={a.url} alt={a.name} className="aspect-video w-full object-cover" />
                        </a>
                      ) : (
                        <a
                          key={a.id}
                          href={a.url}
                          download={a.name}
                          className="col-span-2 flex items-center gap-2 rounded-md border border-border bg-elevated px-2 py-1.5 text-xs transition-colors hover:border-border-strong"
                        >
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate font-medium">{a.name}</span>
                          <span className="text-2xs text-muted-foreground">{formatBytes(a.sizeBytes)}</span>
                          <Download className="size-3.5 text-muted-foreground" />
                        </a>
                      ),
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div ref={endRef} />
    </div>
  )
}

// ---------- Composer ----------

function Composer({
  approvalId,
  itemId,
  draft,
  onDraftChange,
  canTimestamp,
  canDraw,
  drawMode,
  onToggleDraw,
  getTime,
}: {
  approvalId: string
  itemId?: string
  draft: ComposerDraft
  onDraftChange: (d: ComposerDraft) => void
  canTimestamp: boolean
  canDraw: boolean
  drawMode: boolean
  onToggleDraw: () => void
  getTime: () => number | undefined
}) {
  const addApprovalComment = useData((s) => s.addApprovalComment)
  const me = useUser((s) => s.user)
  const [body, setBody] = React.useState('')
  const [files, setFiles] = React.useState<File[]>([])
  const [sending, setSending] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const textRef = React.useRef<HTMLTextAreaElement>(null)

  React.useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`
  }, [body])

  const canSend = !sending && (body.trim() !== '' || files.length > 0 || draft.strokes.length > 0)

  const send = async () => {
    if (!canSend || !me) return
    setSending(true)
    await addApprovalComment({
      approvalId,
      itemId,
      authorId: me.id,
      body: body.trim(),
      timestampSec: draft.timestampSec,
      drawing: draft.strokes.length ? draft.strokes : undefined,
      files,
    })
    setBody('')
    setFiles([])
    onDraftChange({ strokes: [] })
    setSending(false)
    if (drawMode) onToggleDraw()
  }

  const toggleTimestamp = () => {
    if (draft.timestampSec !== undefined) onDraftChange({ ...draft, timestampSec: undefined })
    else onDraftChange({ ...draft, timestampSec: getTime() ?? 0 })
  }

  const hasChips = files.length > 0 || draft.timestampSec !== undefined || draft.strokes.length > 0

  return (
    <div className="shrink-0 p-2">
      <div
        className={cn(
          'rounded-xl border bg-elevated transition-colors duration-150 focus-within:border-border-strong',
          drawMode ? 'border-accent/60' : 'border-border',
        )}
      >
        {hasChips && (
          <div className="flex flex-wrap gap-1 px-2.5 pt-2.5">
            {draft.timestampSec !== undefined && (
              <Chip onRemove={() => onDraftChange({ ...draft, timestampSec: undefined })} accent>
                <Clock className="size-3" /> {formatDuration(draft.timestampSec)}
              </Chip>
            )}
            {draft.strokes.length > 0 && (
              <Chip onRemove={() => onDraftChange({ ...draft, strokes: [] })}>
                <Pencil className="size-3" /> Drawing · {draft.strokes.length} stroke{draft.strokes.length === 1 ? '' : 's'}
              </Chip>
            )}
            {files.map((f, i) => (
              <Chip key={`${f.name}-${i}`} onRemove={() => setFiles((list) => list.filter((_, j) => j !== i))}>
                <Paperclip className="size-3" /> <span className="max-w-32 truncate">{f.name}</span>
              </Chip>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1 px-1.5 py-1.5">
          <ComposerButton label="Attach files" icon={Paperclip} onClick={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            data-testid="comment-files"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              setFiles((list) => [...list, ...picked])
              e.target.value = ''
            }}
          />
          <textarea
            ref={textRef}
            rows={1}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder={drawMode ? 'Describe the change…' : 'Type a message...'}
            aria-label="Comment"
            className="min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-5 outline-none placeholder:text-subtle-foreground"
          />
          <ComposerButton
            label={canTimestamp ? (draft.timestampSec !== undefined ? 'Remove timestamp' : 'Add current timestamp') : 'Timestamps work on videos and audio'}
            icon={Timer}
            onClick={toggleTimestamp}
            active={draft.timestampSec !== undefined}
            disabled={!canTimestamp}
          />
          <ComposerButton
            label={canDraw ? (drawMode ? 'Finish drawing' : 'Draw on the frame') : 'Drawing works on videos and images'}
            icon={Pencil}
            onClick={onToggleDraw}
            active={drawMode}
            disabled={!canDraw}
          />
          <ComposerButton label="Send" icon={SendHorizontal} onClick={send} disabled={!canSend} primary />
        </div>
      </div>
    </div>
  )
}

function Chip({ children, onRemove, accent }: { children: React.ReactNode; onRemove: () => void; accent?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md pr-0.5 pl-1.5 text-2xs font-semibold',
        accent ? 'bg-accent-soft text-accent' : 'bg-elevated-hover text-foreground',
      )}
    >
      {children}
      <button onClick={onRemove} aria-label="Remove" className="flex size-5 items-center justify-center rounded opacity-70 hover:bg-black/10 hover:opacity-100">
        <X className="size-3" />
      </button>
    </span>
  )
}

function ComposerButton({
  label,
  icon: Icon,
  onClick,
  active,
  disabled,
  primary,
}: {
  label: string
  icon: typeof Paperclip
  onClick: () => void
  active?: boolean
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <Hint label={label}>
      <span className="inline-flex">
        <button
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35',
            active
              ? 'bg-accent-soft text-accent'
              : primary
                ? 'text-accent hover:bg-accent-soft'
                : 'text-muted-foreground hover:bg-hover hover:text-foreground',
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </button>
      </span>
    </Hint>
  )
}

// ---------- Approval data ----------

function ApprovalData({
  approval,
  project,
  items,
  canDecide,
  onDecide,
  expired,
}: {
  approval: Approval
  project?: Project
  items: ReviewItem[]
  canDecide: boolean
  onDecide: (d: 'approved' | 'changes_requested') => void
  expired: boolean
}) {
  const { users, clients } = useData()
  const requester = byId(users, approval.requestedBy)
  const turn = currentApprover(approval)

  const rows: [string, React.ReactNode][] = [
    ['Project', project ? <Link key="p" to={`/projects/${project.id}`} className="font-semibold hover:underline">{project.title}</Link> : '—'],
    ['Requested by', requester?.name ?? '—'],
    ['Created', format(new Date(approval.createdAt), 'MMM d, yyyy HH:mm')],
    ['Expires', approval.expiresAt ? format(new Date(approval.expiresAt), 'MMM d, yyyy HH:mm') : 'Never'],
    ['Needs approval', { all: 'All', content: 'Content', media: 'Media' }[approval.scope]],
    [
      'After approval',
      approval.statusAfterApproval ? (
        <span key="s" className="inline-flex items-center gap-1.5">
          <StatusDot status={approval.statusAfterApproval} /> {approval.statusAfterApproval}
        </span>
      ) : (
        '—'
      ),
    ],
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {approval.status !== 'pending' && (
          <div
            className={cn(
              'mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold',
              approval.status === 'approved' ? 'bg-chip-green-bg text-chip-green-fg' : 'bg-danger/15 text-danger',
            )}
          >
            {approval.status === 'approved' ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
            {APPROVAL_STATUS_LABEL[approval.status]}
          </div>
        )}
        {expired && approval.status === 'pending' && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-chip-yellow-bg px-3 py-2.5 text-[13px] font-semibold text-chip-yellow-fg">
            <Clock className="size-4" /> This approval has expired
          </div>
        )}
        <dl className="flex flex-col gap-2.5 text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="truncate text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 mb-2 text-xs font-semibold">Approvers</h3>
        <ol className="flex flex-col gap-1.5">
          {approval.approvers.map((ref, i) => {
            const decision = [...approval.decisions].reverse().find((d) => sameApprover(d.approver, ref))
            const isTurn = turn && sameApprover(turn, ref)
            const name = approverName(ref, users, clients)
            return (
              <li key={`${ref.kind}-${ref.id}`} className={cn('flex items-center gap-2.5 rounded-lg border px-2.5 py-2', isTurn ? 'border-accent/50 bg-accent-soft' : 'border-border bg-surface-sunken')}>
                <span className="w-3 text-2xs font-semibold text-muted-foreground">{i + 1}</span>
                <Avatar name={name} src={ref.kind === 'client' ? byId(clients, ref.id)?.avatarUrl : undefined} size={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{name}</p>
                  <p className="text-2xs text-muted-foreground">{ref.kind === 'client' ? 'Client' : 'Team'}</p>
                </div>
                <span
                  className={cn(
                    'text-2xs font-semibold',
                    decision?.decision === 'approved' && 'text-chip-green-fg',
                    decision?.decision === 'changes_requested' && 'text-danger',
                    !decision && isTurn && 'text-accent',
                    !decision && !isTurn && 'text-muted-foreground',
                  )}
                >
                  {decision ? (decision.decision === 'approved' ? 'Approved' : 'Changes requested') : isTurn ? 'Reviewing' : 'Waiting'}
                </span>
              </li>
            )
          })}
        </ol>

        <h3 className="mt-6 mb-2 text-xs font-semibold">Items ({items.length})</h3>
        <ul className="flex flex-col gap-1 text-xs">
          {items.map((it, i) => (
            <li key={it.key} className="flex items-center gap-2 truncate text-muted-foreground">
              <span className="w-3 text-2xs">{i + 1}</span>
              <span className="truncate text-foreground">{it.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {approval.status === 'pending' && !expired && (
        <div className="shrink-0 border-t border-border p-3">
          {canDecide ? (
            <>
              {turn?.kind === 'client' && (
                <p className="mb-2 text-2xs text-muted-foreground">Reviewing as {approverName(turn, users, clients)} (client link)</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button size="md" onClick={() => onDecide('changes_requested')}>
                  Request changes
                </Button>
                <Button size="md" variant="primary" onClick={() => onDecide('approved')}>
                  <Check /> Approve
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Waiting for {turn ? approverName(turn, users, clients) : 'approvers'} to review.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

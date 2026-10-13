import {
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  EllipsisVertical,
  Eye,
  FileText,
  FolderOpen,
  PanelRight,
  Plus,
  Undo2,
  X,
  CircleAlert,
} from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common'
import { MediaThumb } from '@/components/common/MediaPreview'
import { toast } from '@/components/common/Toaster'
import { ContentStage } from '@/components/approval-review/ContentStage'
import { DRAW_COLORS } from '@/components/approval-review/DrawingLayer'
import { MediaStage, type StageHandle } from '@/components/approval-review/MediaStage'
import { ReviewPanel, type ComposerDraft } from '@/components/approval-review/ReviewPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Hint, TooltipProvider } from '@/components/ui/misc'
import {
  APPROVAL_STATUS_COLOR,
  APPROVAL_STATUS_LABEL,
  approvalLink,
  approverName,
  currentApprover,
  reviewItems,
  type ReviewItem,
} from '@/lib/approvals'
import { formatDuration } from '@/lib/media'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { useNotifications } from '@/store/notifications'
import { useUser } from '@/store/user'
import type { ApprovalComment, DrawingStroke } from '@/types'

/** Full-screen review page opened from the approval link. */
export function ApprovalReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { load, loaded, approvals, projects, media, users, clients, approvalComments, decideApproval, addApprovalItems } = useData()
  const me = useUser((s) => s.user)
  const loadUser = useUser((s) => s.load)
  const loadNotifications = useNotifications((s) => s.load)

  const approval = approvals.find((a) => a.id === id)
  const project = approval && byId(projects, approval.projectId)
  const items = React.useMemo(() => (approval ? reviewItems(approval, media) : []), [approval, media])

  const [index, setIndex] = React.useState(0)
  const [itemFocus, setItemFocus] = React.useState(true)
  const [panelOpen, setPanelOpen] = React.useState(true)
  const [draft, setDraft] = React.useState<ComposerDraft>({ strokes: [] })
  const [drawMode, setDrawMode] = React.useState(false)
  const [drawColor, setDrawColor] = React.useState<string>(DRAW_COLORS[0])
  const [shown, setShown] = React.useState<ApprovalComment>()
  const isDesktop = useIsDesktop()
  const stageRef = React.useRef<StageHandle>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)

  // This page lives outside the app shell (opened from a shared link), so it loads its own data.
  React.useEffect(() => {
    void load()
    void loadUser()
    void loadNotifications()
  }, [load, loadUser, loadNotifications])

  const current: ReviewItem | undefined = items[Math.min(index, items.length - 1)]

  const selectItem = (i: number) => {
    setIndex(i)
    setItemFocus(true)
    setDrawMode(false)
    setDraft({ strokes: [] })
    setShown(undefined)
  }

  if (!loaded) return <div className="flex h-screen items-center justify-center bg-black text-sm text-white/60">Loading approval…</div>
  if (!approval) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <EmptyState
          icon={ClipboardCheck}
          title="Approval not found"
          description="The link may be wrong or the approval was removed."
          action={
            <Link to="/approvals" className="text-xs font-semibold text-accent hover:underline">
              Go to approvals
            </Link>
          }
        />
      </div>
    )
  }

  const turn = currentApprover(approval)
  const expired = !!approval.expiresAt && new Date(approval.expiresAt) < new Date()
  // Client approvers review through the shared link, so whoever opens it can act for them.
  const canDecide = !!turn && !expired && (turn.kind === 'client' || turn.id === me?.id)
  const statusLabel = expired && approval.status === 'pending' ? 'Expired' : APPROVAL_STATUS_LABEL[approval.status]
  const statusColor = expired && approval.status === 'pending' ? '#a3a3a3' : APPROVAL_STATUS_COLOR[approval.status]

  const itemKey = itemFocus ? current?.key : undefined
  const visibleComments = approvalComments
    .filter((c) => c.approvalId === approval.id && c.itemId === itemKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const markers = current
    ? approvalComments
        .filter((c) => c.approvalId === approval.id && c.itemId === current.key && c.timestampSec !== undefined)
        .map((c) => ({ id: c.id, t: c.timestampSec!, label: c.body || 'Drawing' }))
    : []

  const showComment = (c: ApprovalComment) => {
    const i = items.findIndex((it) => it.key === c.itemId)
    if (i >= 0 && i !== index) setIndex(i)
    setItemFocus(true)
    setDrawMode(false)
    setShown(c)
    // Wait for the stage of the (possibly new) item to mount before seeking.
    setTimeout(() => {
      stageRef.current?.pause()
      if (c.timestampSec !== undefined) stageRef.current?.seek(c.timestampSec)
    }, 60)
  }

  const toggleDraw = () => {
    if (drawMode) return setDrawMode(false)
    stageRef.current?.pause()
    setShown(undefined)
    const t = current?.kind === 'media' && current.media.kind === 'video' ? stageRef.current?.getTime() : undefined
    setDraft((d) => ({ ...d, timestampSec: d.timestampSec ?? t }))
    setDrawMode(true)
  }

  const decide = async (decision: 'approved' | 'changes_requested') => {
    if (!turn || !me) return
    try {
      await decideApproval(approval.id, turn, decision, me.id)
      toast(decision === 'approved' ? `Approved as ${approverName(turn, users, clients)}` : 'Changes requested')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(approvalLink(approval.id))
    } catch {
      /* clipboard unavailable */
    }
    toast('Approval link copied')
  }

  const addable = media.filter((m) => m.projectId === approval.projectId && !approval.mediaIds.includes(m.id))
  const canEdit = approval.requestedBy === me?.id && approval.status === 'pending'

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={rootRef} className="flex h-[100dvh] flex-col bg-black text-foreground">
        {/* Top bar */}
        <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:h-[62px] md:gap-3 md:px-4">
          <nav className="flex min-w-0 items-center gap-2 text-sm font-semibold" aria-label="Breadcrumb">
            <Link to="/approvals" className="text-muted-foreground transition-colors hover:text-foreground max-md:hidden">
              Approvals
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-subtle-foreground max-md:hidden" />
            <Link to={project ? `/projects/${project.id}` : '#'} className="truncate hover:underline">
              {project?.title ?? 'Deleted project'}
            </Link>
          </nav>
          <span
            className={cn(
              'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-2xs font-semibold',
              canDecide ? 'border-accent/50 bg-accent-soft text-accent' : 'border-border bg-elevated text-muted-foreground',
            )}
          >
            {canDecide ? <Check className="size-3" /> : <Eye className="size-3" />}
            <span className="max-sm:hidden">{canDecide ? 'Your review' : 'View only'}</span>
          </span>
          {canEdit && (
            <DropdownMenu modal={false}>
              <Hint label="Add items to this approval" side="bottom">
                <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground data-[state=open]:bg-hover">
                  <Plus className="size-4" />
                </DropdownMenuTrigger>
              </Hint>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Add media from {project?.title}</DropdownMenuLabel>
                {addable.length === 0 ? (
                  <p className="px-2 pb-2 text-2xs text-muted-foreground">Every file of this project is already included.</p>
                ) : (
                  addable.map((m) => (
                    <DropdownMenuItem
                      key={m.id}
                      onSelect={async () => {
                        await addApprovalItems(approval.id, [m.id])
                        toast(`Added ${m.name}`)
                      }}
                    >
                      <span className="size-6 shrink-0 overflow-hidden rounded">
                        <MediaThumb item={m} iconClassName="size-3" />
                      </span>
                      <span className="truncate">{m.name}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-3">
            <span className="flex items-center gap-2 text-xs font-semibold">
              {items.length > 0 && (
                <span className="max-md:hidden">
                  Item {Math.min(index, items.length - 1) + 1} of {items.length}:
                </span>
              )}
              <span className="flex items-center gap-1.5" style={{ color: statusColor }}>
                <span className="size-2 rounded-full" style={{ background: statusColor }} />
                {statusLabel}
              </span>
            </span>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                aria-label="Approval actions"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground data-[state=open]:bg-hover"
              >
                <EllipsisVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={copyLink}>
                  <Copy /> Copy link
                </DropdownMenuItem>
                {project && (
                  <DropdownMenuItem onSelect={() => navigate(`/projects/${project.id}`)}>
                    <FolderOpen /> Open project
                  </DropdownMenuItem>
                )}
                {canDecide && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => decide('approved')}>
                      <Check /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => decide('changes_requested')}>
                      <CircleAlert /> Request changes
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Hint label={panelOpen ? 'Hide panel' : 'Show panel'} side="bottom">
              <button
                onClick={() => setPanelOpen((v) => !v)}
                aria-label="Toggle side panel"
                className="flex size-8 max-md:hidden items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
              >
                <PanelRight className="size-4" />
              </button>
            </Hint>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-w-0 flex-col max-md:h-[50dvh] max-md:shrink-0 md:flex-1">
            {/* Item strip */}
            <div className="flex h-[70px] shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 px-3 [justify-content:safe_center] md:h-[104px] md:px-4">
              {items.map((it, i) => {
                const active = it === current
                const dur = it.kind === 'media' ? it.media.durationSec : undefined
                return (
                  <button
                    key={it.key}
                    onClick={() => selectItem(i)}
                    aria-label={`Item ${i + 1}: ${it.name}`}
                    aria-current={active}
                    title={it.name}
                    className={cn(
                      'relative size-[54px] shrink-0 overflow-hidden rounded-xl border-2 bg-[#111] transition-colors duration-150 md:size-[78px]',
                      active ? 'border-white' : 'border-white/10 opacity-70 hover:border-white/40 hover:opacity-100',
                    )}
                  >
                    {it.kind === 'media' ? (
                      <MediaThumb item={it.media} className="opacity-90" />
                    ) : (
                      <span className="flex size-full flex-col items-center justify-center gap-1 text-white/70">
                        <FileText className="size-5" />
                        <span className="text-[9px] font-semibold max-md:hidden">Overview</span>
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-3 pb-1 text-[10px] font-bold text-white">
                      <span>{i + 1}</span>
                      {dur !== undefined && <span className="max-md:hidden">{formatDuration(dur).padStart(5, '0')}</span>}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Stage */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              {current && itemFocus && (
                <div className="absolute top-2 left-2 z-20 flex h-7 max-w-[70%] md:top-4 md:left-4 md:max-w-[60%] items-center gap-1.5 rounded-full bg-[#1a1a1a]/90 pr-1.5 pl-2.5 text-xs font-semibold text-white">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: statusColor }} />
                  <FileText className="size-3.5 shrink-0" />
                  <span className="truncate">{current.name}</span>
                  <button onClick={() => setItemFocus(false)} aria-label="Comment on the whole approval" className="flex size-5 items-center justify-center rounded-full hover:bg-white/10">
                    <X className="size-3" />
                  </button>
                </div>
              )}

              {drawMode && (
                <div className="absolute top-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full md:top-4 md:gap-1 border border-white/10 bg-black/70 p-1 text-white shadow-lg backdrop-blur-md">
                  {DRAW_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDrawColor(c)}
                      aria-label={`Color ${c}`}
                      className={cn('flex size-7 items-center justify-center rounded-full', drawColor === c && 'bg-white/15')}
                    >
                      <span className="size-4 rounded-full ring-1 ring-white/30" style={{ background: c }} />
                    </button>
                  ))}
                  <span className="mx-1 h-4 w-px bg-white/20" />
                  <button
                    onClick={() => setDraft((d) => ({ ...d, strokes: d.strokes.slice(0, -1) }))}
                    disabled={!draft.strokes.length}
                    className="flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                  >
                    <Undo2 className="size-3.5" /> <span className="max-sm:hidden">Undo</span>
                  </button>
                  <button
                    onClick={() => setDraft((d) => ({ ...d, strokes: [] }))}
                    disabled={!draft.strokes.length}
                    className="flex h-7 items-center rounded-full px-2.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setDrawMode(false)}
                    className="flex h-7 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <Check className="size-3.5" /> Done
                  </button>
                </div>
              )}

              {shown?.drawing?.length && !drawMode ? (
                <button
                  onClick={() => setShown(undefined)}
                  className="absolute top-11 left-1/2 z-20 flex h-7 -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/70 whitespace-nowrap md:top-4 px-3 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/85"
                >
                  Showing drawing
                  {shown.timestampSec !== undefined && ` at ${formatDuration(shown.timestampSec)}`}
                  <X className="size-3" />
                </button>
              ) : null}

              {!current ? (
                <EmptyState icon={FileText} title="Nothing to review" description="This approval has no items." className="flex-1 text-white" />
              ) : current.kind === 'content' ? (
                project && <ContentStage project={project} />
              ) : !current.media.url ? (
                <EmptyState
                  icon={CircleAlert}
                  title="File unavailable"
                  description="This file is no longer stored on this device."
                  className="flex-1 [&_p]:text-white/70"
                />
              ) : (
                <MediaStage
                  key={current.key}
                  ref={stageRef}
                  item={current.media}
                  fullscreenTarget={rootRef}
                  drawing={
                    drawMode
                      ? { editable: true, strokes: draft.strokes, color: drawColor, onChange: (strokes: DrawingStroke[]) => setDraft((d) => ({ ...d, strokes })) }
                      : null
                  }
                  shownStrokes={shown?.itemId === current.key ? shown.drawing : undefined}
                  onPlaybackStart={() => {
                    setShown(undefined)
                    setDrawMode(false)
                  }}
                  markers={markers}
                  onMarkerClick={(cid) => {
                    const c = approvalComments.find((x) => x.id === cid)
                    if (c) showComment(c)
                  }}
                />
              )}
            </div>
          </div>

          {(panelOpen || !isDesktop) && (
            <ReviewPanel
              approval={approval}
              project={project}
              items={items}
              currentItem={current}
              itemFocus={itemFocus}
              onClearFocus={() => setItemFocus(false)}
              comments={visibleComments}
              onShowComment={showComment}
              draft={draft}
              onDraftChange={setDraft}
              drawMode={drawMode}
              onToggleDraw={toggleDraw}
              getTime={() => stageRef.current?.getTime()}
              canDecide={canDecide}
              onDecide={decide}
              expired={expired}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

import { format, formatDistanceToNow } from 'date-fns'
import { Bell, ChevronRight, FileText, MessageCircle, PanelLeft, PanelRight, Paperclip, Plus, SendHorizontal, Upload, type LucideIcon } from 'lucide-react'
import * as React from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Avatar, EmptyState } from '@/components/common'
import { ActionsMenu } from '@/components/project-detail/ActionsMenu'
import { AudioSection, type AudioSectionHandle } from '@/components/project-detail/AudioSection'
import { FieldChips } from '@/components/project-detail/FieldChips'
import { MediaSection, type MediaSectionHandle } from '@/components/project-detail/MediaSection'
import { SectionHeader } from '@/components/project-detail/shared'
import { EditableTitle, ScriptEditor } from '@/components/project-detail/TitleAndScript'
import { Checkbox, Hint } from '@/components/ui/misc'
import { queryToParams } from '@/lib/projectFilters'
import { useIsLarge, useIsXL } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { useProjectsView } from '@/store/projectsView'
import type { Project } from '@/types'

export function ProjectDetailPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const { projects, loaded } = useData()
  const project = byId(projects, id)
  const query = useProjectsView((s) => s.query)
  // Side panels sit inline on wide screens and become slide-over drawers on smaller ones (closed by default).
  const leftInline = useIsLarge()
  const rightInline = useIsXL()
  // A user toggle only applies to the layout it was made in; crossing a breakpoint resets to the default.
  const [leftPref, setLeftPrefState] = React.useState<{ inline: boolean; open: boolean }>()
  const [rightPref, setRightPrefState] = React.useState<{ inline: boolean; open: boolean }>()
  const leftOpen = leftPref?.inline === leftInline ? leftPref.open : leftInline
  const rightOpen = rightPref?.inline === rightInline ? rightPref.open : rightInline
  const setLeftPref = (open: boolean) => setLeftPrefState({ inline: leftInline, open })
  const setRightPref = (open: boolean) => setRightPrefState({ inline: rightInline, open })
  const setLeftOpen = (fn: (v: boolean) => boolean) => setLeftPref(fn(leftOpen))
  const setRightOpen = (fn: (v: boolean) => boolean) => setRightPref(fn(rightOpen))
  const mediaRef = React.useRef<MediaSectionHandle>(null)
  const audioRef = React.useRef<AudioSectionHandle>(null)
  const tasksRef = React.useRef<TasksSectionHandle>(null)

  // "Projects" goes back to the list with the filters that were applied.
  const search = queryToParams(query).toString().replace(/%2C/gi, ',')
  const projectsHref = `/projects${search ? `?${search}` : ''}`

  // /projects/:id#media (from the card's "+") jumps straight to the media section.
  React.useEffect(() => {
    if (loaded && hash === '#media') setTimeout(() => mediaRef.current?.reveal(), 50)
  }, [loaded, hash, id])

  if (!loaded) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>
  if (!project) {
    return (
      <EmptyState
        icon={FileText}
        title="Project not found"
        description="It may have been deleted."
        action={
          <Link to={projectsHref} className="text-xs text-foreground underline">
            Back to projects
          </Link>
        }
        className="h-screen"
      />
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col max-md:h-[calc(100dvh-56px-env(safe-area-inset-bottom))]">
      <header className="flex h-[50px] shrink-0 items-center gap-1 border-b border-border px-2 md:gap-2">
        <IconButton icon={PanelLeft} label={leftOpen ? 'Hide sidebar' : 'Show sidebar'} onClick={() => setLeftOpen((v) => !v)} />
        <nav className="ml-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold md:ml-2.5" aria-label="Breadcrumb">
          <Link to={projectsHref} className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
            Projects
          </Link>
          <ChevronRight className="size-3.5 shrink-0 text-subtle-foreground" />
          <span className="truncate">{project.title}</span>
        </nav>
        <Followers />
        <div className="ml-auto flex items-center gap-1">
          <ActionsMenu project={project} projectsHref={projectsHref} onAddAudio={() => audioRef.current?.openPicker()} />
          <IconButton icon={PanelRight} label={rightOpen ? 'Hide comments' : 'Show comments'} onClick={() => setRightOpen((v) => !v)} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <SidePane side="left" inline={leftInline} open={leftOpen} onClose={() => setLeftPref(false)}>
          <LeftPanel
            project={project}
            onAddTask={() => {
              if (!leftInline) setLeftPref(false)
              tasksRef.current?.focusInput()
            }}
            onUpload={() => mediaRef.current?.openPicker()}
          />
        </SidePane>
        <div id="project-main" className="min-w-0 flex-1 overflow-y-auto">
          {/* key: reset local editors when navigating between projects */}
          <div key={project.id} className="mx-auto max-w-[1064px] px-4 pt-4 pb-24 md:px-8 md:pt-[23px]">
            <EditableTitle project={project} autoEdit={params.get('edit') === '1'} />
            <div className="mt-3">
              <FieldChips project={project} />
            </div>
            <div className="mt-[22px] h-px bg-border" />
            <ScriptEditor project={project} />
            <div className="h-px bg-border" />
            <div className="mt-[22px] flex flex-col gap-[22px]">
              <TasksSection ref={tasksRef} project={project} />
              <MediaSection ref={mediaRef} project={project} />
              <AudioSection ref={audioRef} project={project} />
            </div>
          </div>
        </div>
        <SidePane side="right" inline={rightInline} open={rightOpen} onClose={() => setRightPref(false)}>
          <CommentsPanel />
        </SidePane>
      </div>
    </div>
  )
}

function IconButton({ icon: Icon, label, onClick, active }: { icon: LucideIcon; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <Hint label={label} side="bottom">
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          'flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </button>
    </Hint>
  )
}

/** Inline column on wide screens; slide-over drawer with a backdrop otherwise. */
function SidePane({
  side,
  inline,
  open,
  onClose,
  children,
}: {
  side: 'left' | 'right'
  inline: boolean
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  React.useEffect(() => {
    if (inline || !open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inline, open, onClose])

  if (!open) return null
  if (inline) return <>{children}</>
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button aria-label="Close panel" onClick={onClose} className="absolute inset-0 bg-overlay" />
      <div
        className={cn(
          'absolute inset-y-0 flex w-[88vw] bg-surface shadow-popover [&>aside]:w-full [&>aside]:border-0',
          side === 'left' ? 'left-0 max-w-[300px]' : 'right-0 max-w-[380px]',
        )}
      >
        {children}
      </div>
    </div>
  )
}

function Followers() {
  const [following, setFollowing] = React.useState(true)
  return (
    <div className="ml-3 flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground max-sm:hidden">{following ? '1 follower' : '0 followers'}</span>
      <IconButton icon={Bell} label={following ? 'Unfollow' : 'Follow'} onClick={() => setFollowing((v) => !v)} active={following} />
    </div>
  )
}

// ---------- Tasks ----------

interface TasksSectionHandle {
  focusInput: () => void
}

const TasksSection = React.forwardRef<TasksSectionHandle, { project: Project }>(({ project }, ref) => {
  const { tasks, users, toggleTask, createTask } = useData()
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const sectionRef = React.useRef<HTMLElement>(null)
  const list = tasks.filter((t) => t.projectId === project.id)

  React.useImperativeHandle(ref, () => ({
    focusInput: () => {
      setOpen(true)
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => inputRef.current?.focus(), 50)
    },
  }))

  return (
    <section id="tasks" ref={sectionRef} className="scroll-mt-4">
      <SectionHeader title="Tasks" count={list.length || undefined} open={open} onToggle={() => setOpen((v) => !v)} />
      {open && (
        <div className="mt-2">
          <ul className="flex flex-col">
            {list.map((t) => {
              const assignee = byId(users, t.assigneeId)
              return (
                <li key={t.id} className="flex h-9 items-center gap-3 border-b border-border px-1">
                  <Checkbox round checked={t.done} onCheckedChange={() => toggleTask(t.id)} aria-label={`Complete ${t.title}`} className="size-4" />
                  <span className={cn('flex-1 truncate text-sm', t.done && 'text-subtle-foreground line-through')}>{t.title}</span>
                  {assignee && <Avatar name={assignee.name} size={18} />}
                </li>
              )
            })}
          </ul>
          <form
            className="mt-1 flex items-center gap-2 px-1"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!draft.trim()) return
              await createTask({ title: draft.trim(), projectId: project.id, assigneeId: project.assigneeId })
              setDraft('')
            }}
          >
            <Plus className="size-4 text-subtle-foreground" />
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a task and press Enter"
              className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
            />
          </form>
        </div>
      )}
    </section>
  )
})
TasksSection.displayName = 'TasksSection'

// ---------- Left panel ----------

function PanelHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-11 items-center border-b border-border px-4', className)}>
      <h2 className="text-sm font-semibold">{children}</h2>
    </div>
  )
}

function LeftPanel({ project, onAddTask, onUpload }: { project: Project; onAddTask: () => void; onUpload: () => void }) {
  const { users, clients, tasks, media } = useData()
  const projectTasks = tasks.filter((t) => t.projectId === project.id)
  const projectMedia = media.filter((m) => m.projectId === project.id)
  const done = projectTasks.filter((t) => t.done).length
  const client = byId(clients, project.clientId)
  const people = [
    { user: byId(users, project.ownerId), role: 'Owner' },
    { user: byId(users, project.assigneeId), role: 'Assignee' },
    { user: byId(users, project.approverId), role: 'Approver' },
  ].filter((p) => p.user)

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <aside className="w-[265px] shrink-0 overflow-y-auto border-r border-border">
      <PanelHeading className="h-[54px] pt-2">Quick Actions</PanelHeading>
      <div className="flex flex-col gap-[11px] px-3 pt-[15px] pb-4">
        <QuickAction icon={Plus} label="Add Task" kbd="⌘ K" onClick={onAddTask} />
        <QuickAction icon={Upload} label="Upload" kbd="⌘ U" onClick={onUpload} />
      </div>

      <PanelHeading>Project Summary</PanelHeading>
      <dl className="flex flex-col gap-2 px-4 py-3 text-xs">
        <SummaryRow label="Status" value={project.status} />
        <SummaryRow label="Due date" value={format(new Date(project.dueDate), 'MMM d, yyyy')} />
        <SummaryRow label="Progress" value={projectTasks.length ? `${done}/${projectTasks.length} tasks` : '–'} />
        <SummaryRow label="Last updated" value={formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })} />
      </dl>

      <PanelHeading>Navigate</PanelHeading>
      <ul className="flex flex-col py-2 text-xs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: 'Tasks', count: projectTasks.length },
          { id: 'media', label: 'Media', count: projectMedia.filter((m) => m.kind !== 'audio').length },
          { id: 'audio', label: 'Audio', count: projectMedia.filter((m) => m.kind === 'audio').length },
        ].map((item) => (
          <li key={item.id}>
            <button
              onClick={() =>
                item.id === 'overview'
                  ? document.getElementById('project-main')?.scrollTo({ top: 0, behavior: 'smooth' })
                  : scrollTo(item.id)
              }
              className="flex h-[26px] w-full items-center justify-between px-4 text-left transition-colors hover:bg-hover"
            >
              {item.label}
              {item.count !== undefined && <span className="text-muted-foreground">({item.count})</span>}
            </button>
          </li>
        ))}
      </ul>

      <PanelHeading>People</PanelHeading>
      <ul className="flex flex-col gap-2.5 px-4 py-3 text-xs">
        {people.map(({ user, role }) => (
          <li key={role} className="flex items-center gap-2">
            <Avatar name={user!.name} size={18} />
            <span className="flex-1 truncate">{user!.name}</span>
            <span className="text-2xs text-muted-foreground">{role}</span>
          </li>
        ))}
        {client && (
          <li className="flex items-center gap-2">
            <Avatar name={client.name} src={client.avatarUrl} size={18} />
            <span className="flex-1 truncate">{client.name}</span>
            <span className="text-2xs text-muted-foreground">Client Contact</span>
          </li>
        )}
      </ul>
    </aside>
  )
}

function QuickAction({ icon: Icon, label, kbd, onClick }: { icon: LucideIcon; label: string; kbd: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[33px] items-center gap-2 rounded-lg border border-border bg-elevated px-3 text-xs font-semibold transition-colors duration-150 hover:border-border-strong hover:bg-elevated-hover"
    >
      <Icon className="size-3.5" />
      {label}
      <kbd className="ml-auto font-sans text-2xs font-normal text-subtle-foreground">{kbd}</kbd>
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}

// ---------- Comments ----------

function CommentsPanel() {
  const [comments, setComments] = React.useState<{ id: number; body: string; at: Date }[]>([])
  const [draft, setDraft] = React.useState('')
  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-border">
      <PanelHeading className="h-[54px] pt-2">Comments</PanelHeading>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Leave the first comment"
            className="h-full [&>p:first-of-type]:text-[18px] [&>p:first-of-type]:leading-7 [&>p:first-of-type]:font-normal [&>p:last-of-type]:text-sm [&>svg]:size-10"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-elevated px-3 py-2">
                <p className="text-sm">{c.body}</p>
                <p className="mt-1 text-2xs text-subtle-foreground">{formatDistanceToNow(c.at, { addSuffix: true })}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form
        className="m-2 flex h-10 items-center gap-2 rounded-lg border border-border bg-elevated px-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          setComments((c) => [...c, { id: Date.now(), body: draft.trim(), at: new Date() }])
          setDraft('')
        }}
      >
        <Paperclip className="size-3.5 text-subtle-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-subtle-foreground"
        />
        <button type="submit" aria-label="Send" className="text-subtle-foreground transition-colors hover:text-foreground disabled:opacity-40" disabled={!draft.trim()}>
          <SendHorizontal className="size-3.5" />
        </button>
      </form>
    </aside>
  )
}

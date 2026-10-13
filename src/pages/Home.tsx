import { formatDistanceToNow, isBefore, startOfDay } from 'date-fns'
import {
  Check,
  ChevronDown,
  FileCheck,
  FolderKanban,
  LayoutGrid,
  MessageCircle,
  Plus,
  SquareCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, EmptyState, Panel } from '@/components/common'
import { NewProjectDialog, NewTaskDialog } from '@/components/home/dialogs'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox, Hint } from '@/components/ui/misc'
import { isUserApprover } from '@/lib/approvals'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { useUser } from '@/store/user'
import type { Approval } from '@/types'

type Tone = 'gray' | 'green' | 'yellow' | 'blue'
const TONES: Record<Tone, string> = {
  gray: 'bg-chip-gray-bg text-chip-gray-fg',
  green: 'bg-chip-green-bg text-chip-green-fg',
  yellow: 'bg-chip-yellow-bg text-chip-yellow-fg',
  blue: 'bg-chip-blue-bg text-chip-blue-fg',
}

function IconChip({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  )
}

function StatCard({ icon, tone, value, label }: { icon: LucideIcon; tone: Tone; value: number; label: string }) {
  return (
    <Panel className="flex h-[70px] min-w-0 items-center gap-3 px-3">
      <IconChip icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-lg leading-6 font-bold">{value}</p>
        <p className="truncate text-2xs text-muted-foreground">{label}</p>
      </div>
    </Panel>
  )
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-base font-semibold', className)}>{children}</h2>
}

export function HomePage() {
  const user = useUser((s) => s.user)
  const { projects, clients, users, tasks, approvals, team, messages, toggleTask, loaded } = useData()
  const [clientId, setClientId] = useState<string>('all')
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const me = user?.id ?? ''

  const data = useMemo(() => {
    const scoped = projects.filter((p) => clientId === 'all' || p.clientId === clientId)
    const projectIds = new Set(scoped.map((p) => p.id))
    const active = scoped.filter((p) => !p.archived)
    const today = startOfDay(new Date())
    const onTrack = active.filter(
      (p) => p.status !== 'Changes Requested' && (p.status === 'Final Video Accepted' || !isBefore(new Date(p.dueDate), today)),
    )
    const myTasks = tasks.filter((t) => t.assigneeId === me && !t.done && projectIds.has(t.projectId))
    const newestFirst = [...approvals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const scopedApprovals = newestFirst.filter((a) => projectIds.has(a.projectId) && a.status === 'pending')
    return {
      active,
      onTrack,
      myTasks,
      activeApprovals: scopedApprovals,
      received: scopedApprovals.filter((a) => isUserApprover(a, me)),
      sent: newestFirst.filter((a) => a.requestedBy === me && projectIds.has(a.projectId)),
      recent: [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    }
  }, [projects, tasks, approvals, clientId, me])

  const selectedClient = byId(clients, clientId)
  const unread = messages.filter((m) => !m.read).length

  return (
    <div className="flex min-h-screen gap-[34px] px-4 md:pr-[20px] md:pl-[18px]">
      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col pb-6">
        <div className="pt-[13px]">
          <h1 className="text-lg leading-6 font-semibold">Hello {user?.name ?? ''} 👋</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening today.</p>
        </div>

        {/* Stats */}
        <div className="mt-[14px] grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="col-span-2 flex h-[70px] min-w-0 items-center gap-3 rounded-xl border border-border bg-surface px-3 text-left md:col-span-1 transition-colors duration-150 outline-none hover:border-border-strong hover:bg-hover data-[state=open]:border-border-strong">
                {selectedClient ? (
                  <Avatar name={selectedClient.name} src={selectedClient.avatarUrl} size={36} className="rounded-lg" />
                ) : (
                  <IconChip icon={LayoutGrid} tone="gray" />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-lg leading-6 font-bold">
                    <span className="truncate">{selectedClient ? selectedClient.name : 'Overall'}</span>
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  </p>
                  <p className="truncate text-2xs text-muted-foreground">{selectedClient ? 'Client' : 'All Clients'}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuRadioGroup value={clientId} onValueChange={setClientId}>
                <DropdownMenuRadioItem value="all">
                  <LayoutGrid /> All Clients
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                {clients.map((c) => (
                  <DropdownMenuRadioItem key={c.id} value={c.id}>
                    <Avatar name={c.name} src={c.avatarUrl} size={16} /> {c.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <StatCard icon={FolderKanban} tone="gray" value={data.active.length} label="Active Projects" />
          <StatCard icon={TrendingUp} tone="green" value={data.onTrack.length} label="On Track" />
          <StatCard icon={SquareCheck} tone="yellow" value={data.myTasks.length} label="Tasks" />
          <StatCard icon={FileCheck} tone="blue" value={data.activeApprovals.length} label="Active Approvals" />
        </div>

        {/* Recent projects */}
        <Panel className="mt-[13px] px-4 pt-[14px] pb-[17px]">
          <div className="flex h-6 items-center justify-between">
            <SectionTitle>Recent Projects</SectionTitle>
            <Hint label="New project">
              <Button variant="ghost" size="icon-sm" onClick={() => setNewProjectOpen(true)} aria-label="New project" className="-mr-1.5">
                <Plus className="!size-4" />
              </Button>
            </Hint>
          </div>
          <div className="mt-[30px]">
            {!loaded ? (
              <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="h-[206px] animate-pulse rounded-xl border border-border bg-surface-sunken" />
                ))}
              </div>
            ) : data.recent.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create a project to get started."
                className="h-[206px]"
              />
            ) : (
              <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 xl:grid-cols-4">
                {data.recent.map((p) => (
                  <ProjectCard key={p.id} project={p} variant="compact" />
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Tasks */}
        <Panel className="mt-[15px] flex min-h-[328px] flex-col px-4 pt-[14px] pb-4">
          <SectionTitle>Tasks</SectionTitle>
          {data.myTasks.length === 0 ? (
            <EmptyState
              icon={SquareCheck}
              title="No tasks assigned"
              description="Tasks assigned to you will appear here."
              action={
                <Button size="sm" onClick={() => setNewTaskOpen(true)} className="h-7 border-transparent bg-elevated-hover px-3">
                  <Plus /> New Task
                </Button>
              }
              className="flex-1 pt-6"
            />
          ) : (
            <>
              <ul className="mt-3 flex flex-col divide-y divide-border">
                {data.myTasks.map((t) => {
                  const project = byId(projects, t.projectId)
                  return (
                    <li key={t.id} className="flex h-10 items-center gap-3">
                      <Checkbox round checked={t.done} onCheckedChange={() => toggleTask(t.id)} aria-label={`Complete ${t.title}`} className="size-4" />
                      <span className="flex-1 truncate text-sm">{t.title}</span>
                      {project && (
                        <Link to={`/projects/${project.id}`} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                          {project.title}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
              <div className="mt-auto pt-3">
                <Button size="sm" onClick={() => setNewTaskOpen(true)} className="h-7 border-transparent bg-elevated-hover px-3">
                  <Plus /> New Task
                </Button>
              </div>
            </>
          )}
        </Panel>

        {/* Approvals */}
        <Panel className="mt-[15px] px-4 pt-[14px] pb-5">
          <SectionTitle>Approvals</SectionTitle>
          <div className="mt-[30px] grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
            <ApprovalColumn title="Received" empty="No received" items={data.received} direction="received" />
            <ApprovalColumn title="Sent" empty="No sent" items={data.sent} direction="sent" />
          </div>
        </Panel>
      </div>

      {/* Right column */}
      <aside className="sticky top-0 hidden h-screen w-[294px] shrink-0 flex-col pt-[64px] pb-2 lg:flex">
        <div className="flex h-5 items-center gap-2">
          <Users className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <SectionTitle className="text-sm">Team</SectionTitle>
          <span className="text-2xs text-muted-foreground">({team.length})</span>
        </div>
        <Panel className="mt-[6px] px-[17px] py-[13px]">
          {team.length === 0 ? (
            <p className="py-1 text-2xs text-muted-foreground">No team members</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {team.map((m) => {
                const u = byId(users, m.userId)
                if (!u) return null
                return (
                  <li key={m.userId} className="flex items-center gap-2.5">
                    <Avatar name={u.name} src={u.avatarUrl} size={24} />
                    <span className="flex-1 truncate text-sm">{u.name}</span>
                    <span className="text-2xs text-muted-foreground capitalize">{u.role}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <div className="mt-[22px] flex h-5 items-center gap-2">
          <MessageCircle className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <SectionTitle className="text-sm">Messages</SectionTitle>
          <span className="text-2xs text-muted-foreground">({unread} unread)</span>
        </div>
        <Panel className="mt-[6px] flex min-h-0 flex-1 flex-col overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No messages yet" className="flex-1 [&_p]:text-2xs [&_p]:font-normal" />
          ) : (
            <ul className="divide-y divide-border">
              {messages.map((m) => {
                const author = byId(users, m.authorId)
                return (
                  <li key={m.id} className="flex gap-2.5 px-4 py-3">
                    <Avatar name={author?.name ?? '?'} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{author?.name}</span>
                        {!m.read && <span className="size-1.5 rounded-full bg-danger" />}
                        <span className="ml-auto text-2xs text-muted-foreground">
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{m.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </aside>

      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} defaultClientId={selectedClient?.id} />
      <NewTaskDialog open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </div>
  )
}

function ApprovalColumn({
  title,
  empty,
  items,
  direction,
}: {
  title: string
  empty: string
  items: Approval[]
  direction: 'received' | 'sent'
}) {
  const { projects, users } = useData()
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="pt-[38px] pb-2 text-center text-2xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-border">
          {items.map((a) => {
            const project = byId(projects, a.projectId)
            const other = byId(users, direction === 'received' ? a.requestedBy : a.approvers.find((ap) => ap.kind === 'user')?.id)
            return (
              <li key={a.id}>
                <Link
                  to={`/approvals/${a.id}`}
                  className="-mx-2 flex h-11 items-center gap-2.5 rounded-md px-2 transition-colors duration-150 hover:bg-hover"
                >
                  <Avatar name={other?.name ?? '?'} size={22} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project?.title ?? 'Deleted project'}</p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {direction === 'received' ? `From ${other?.name}` : `To ${other?.name}`} ·{' '}
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {a.status === 'approved' ? (
                    <span className="flex items-center gap-1 text-2xs text-chip-green-fg">
                      <Check className="size-3" /> Approved
                    </span>
                  ) : a.status === 'changes_requested' ? (
                    <span className="text-2xs text-danger">Changes requested</span>
                  ) : (
                    <span className="text-2xs text-chip-yellow-fg">Pending</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

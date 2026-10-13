import { format } from 'date-fns'
import { Calendar, Package, Plus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, StatusDot } from '@/components/common'
import { Checkbox, Hint } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import type { CardField } from '@/store/projectsView'
import { useUser } from '@/store/user'
import type { Project } from '@/types'
import { ProjectMenu } from './ProjectMenu'

const ALL_FIELDS: Record<CardField, boolean> = { client: true, status: true, service: true, assignee: true, dueDate: true }

interface ProjectCardProps {
  project: Project
  variant?: 'full' | 'compact'
  fields?: Record<CardField, boolean>
  selected?: boolean
  onToggleSelect?: () => void
}

export function ProjectCard({ project, variant = 'full', fields = ALL_FIELDS, selected, onToggleSelect }: ProjectCardProps) {
  const navigate = useNavigate()
  const clients = useData((s) => s.clients)
  const users = useData((s) => s.users)
  const me = useUser((s) => s.user)
  const client = byId(clients, project.clientId)
  const assignee = byId(users, project.assigneeId)
  const assigneeName = assignee?.name ?? 'Unassigned'
  // Projects not assigned to me read dimmer, like the reference.
  const dimmed = variant === 'full' && me && project.assigneeId !== me.id

  const open = () => navigate(`/projects/${project.id}`)

  const header = (
    <div className="flex items-start justify-between gap-2">
      <h3 className="min-w-0 truncate text-[14px] leading-6 font-semibold text-foreground">{project.title}</h3>
      <div className="-mr-1 flex shrink-0 items-center gap-1.5">
        <ProjectMenu project={project} />
        {variant === 'full' && (
          <Checkbox
            round
            checked={selected}
            onCheckedChange={() => onToggleSelect?.()}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${project.title}`}
            className="size-6 border-border-strong"
          />
        )}
      </div>
    </div>
  )

  const clientRow = fields.client && client && (
    <div className="flex h-6 items-center gap-2">
      {client.avatarUrl && <Avatar name={client.name} src={client.avatarUrl} size={22} />}
      <span className="truncate text-sm text-muted-foreground">{client.name}</span>
    </div>
  )

  const statusRow = fields.status && (
    <div className="flex h-5 items-center gap-2">
      <StatusDot status={project.status} className="size-[7px]" />
      <span className="truncate text-sm font-medium text-muted-foreground">{project.status}</span>
    </div>
  )

  if (variant === 'compact') {
    return (
      <article
        onClick={open}
        className="group flex min-h-[206px] cursor-pointer flex-col rounded-xl border border-border bg-surface-sunken px-4 pt-3.5 pb-4 transition-colors duration-150 hover:border-border-strong hover:bg-hover"
      >
        {header}
        <div className="mt-1.5 flex flex-col gap-[9px]">
          {clientRow}
          {statusRow}
          <span className="mt-2 truncate text-sm text-muted-foreground">{assigneeName}</span>
          <span className="mt-2 text-sm text-muted-foreground">{format(new Date(project.dueDate), 'd/M/yyyy')}</span>
        </div>
      </article>
    )
  }

  const meta = [
    fields.service && { icon: Package, label: project.service },
    fields.assignee && { icon: Users, label: assigneeName },
    fields.dueDate && { icon: Calendar, label: format(new Date(project.dueDate), 'MMM d, yyyy') },
  ].filter(Boolean) as { icon: typeof Package; label: string }[]

  return (
    <article
      onClick={open}
      className={cn(
        'group relative flex h-full min-h-[262px] cursor-pointer flex-col rounded-xl border border-border bg-surface-sunken px-4 pt-3.5 pb-3 transition-colors duration-150 hover:border-border-strong hover:bg-hover',
        selected && 'border-accent/70 hover:border-accent',
      )}
    >
      <div className={cn('flex flex-1 flex-col transition-opacity duration-150', dimmed && 'opacity-60 group-hover:opacity-100')}>
        {header}
        <div className="mt-1.5 flex flex-col gap-[7px]">
          {clientRow}
          {statusRow}
        </div>
        {meta.length > 0 && (
          <>
            <div className="mt-[18px] mb-[15px] h-px bg-border" />
            <ul className="flex flex-col gap-[6px]">
              {meta.map(({ icon: Icon, label }) => (
                <li key={label} className="flex h-4 items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="size-[15px] shrink-0 text-subtle-foreground" strokeWidth={1.6} />
                  <span className="truncate">{label}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="mt-auto flex justify-end pt-3">
        <Hint label="Add content">
          <button
            aria-label="Add content"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/projects/${project.id}#media`)
            }}
            className="flex size-[22px] items-center justify-center rounded-full border border-border-strong text-muted-foreground transition-colors duration-150 hover:border-subtle-foreground hover:bg-elevated-hover hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </Hint>
      </div>
    </article>
  )
}

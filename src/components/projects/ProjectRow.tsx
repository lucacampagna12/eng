import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Avatar, StatusDot } from '@/components/common'
import { Checkbox } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import type { CardField } from '@/store/projectsView'
import { useUser } from '@/store/user'
import type { Project } from '@/types'
import { ProjectMenu } from './ProjectMenu'

export const LIST_GRID =
  'grid grid-cols-[28px_minmax(140px,1.4fr)_minmax(120px,1.2fr)_minmax(120px,1fr)_minmax(110px,1fr)_minmax(100px,0.9fr)_96px_28px] items-center gap-3'

export function ProjectListHeader({ fields }: { fields: Record<CardField, boolean> }) {
  return (
    <div className={cn(LIST_GRID, 'h-8 border-b border-border px-3 text-2xs font-medium text-subtle-foreground')}>
      <span />
      <span>Project</span>
      <span>{fields.client && 'Client'}</span>
      <span>{fields.status && 'Status'}</span>
      <span>{fields.service && 'Service'}</span>
      <span>{fields.assignee && 'Assignee'}</span>
      <span>{fields.dueDate && 'Due'}</span>
      <span />
    </div>
  )
}

export function ProjectRow({
  project,
  fields,
  selected,
  onToggleSelect,
}: {
  project: Project
  fields: Record<CardField, boolean>
  selected: boolean
  onToggleSelect: () => void
}) {
  const navigate = useNavigate()
  const clients = useData((s) => s.clients)
  const users = useData((s) => s.users)
  const me = useUser((s) => s.user)
  const client = byId(clients, project.clientId)
  const assignee = byId(users, project.assigneeId)
  const dimmed = me && project.assigneeId !== me.id

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className={cn(
        LIST_GRID,
        'group h-11 cursor-pointer border-b border-border px-3 text-sm transition-colors duration-150 last:border-b-0 hover:bg-hover',
        selected && 'bg-hover',
      )}
    >
      <Checkbox
        round
        checked={selected}
        onCheckedChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${project.title}`}
        className="size-[18px]"
      />
      <span className={cn('truncate font-semibold', dimmed && 'text-muted-foreground')}>{project.title}</span>
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {fields.client && client && (
          <>
            {client.avatarUrl && <Avatar name={client.name} src={client.avatarUrl} size={18} />}
            <span className="truncate">{client.name}</span>
          </>
        )}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {fields.status && (
          <>
            <StatusDot status={project.status} className="size-[7px]" />
            <span className="truncate">{project.status}</span>
          </>
        )}
      </span>
      <span className="truncate text-xs text-muted-foreground">{fields.service && project.service}</span>
      <span className="truncate text-xs text-muted-foreground">{fields.assignee && assignee?.name}</span>
      <span className="text-xs text-muted-foreground">{fields.dueDate && format(new Date(project.dueDate), 'MMM d, yyyy')}</span>
      <ProjectMenu project={project} className="opacity-60 group-hover:opacity-100" />
    </div>
  )
}

import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { Client, Project } from '@/types'

export type ListField = 'client' | 'assignee' | 'type' | 'service' | 'status' | 'createdBy' | 'approver'
export type FilterField = ListField | 'due'
export const DEFAULT_FIELDS: FilterField[] = ['client', 'assignee', 'type', 'service', 'due']
export const EXTRA_FIELDS: ListField[] = ['status', 'createdBy', 'approver']

export const FIELD_LABELS: Record<FilterField, string> = {
  client: 'Client',
  assignee: 'Assignee',
  type: 'Type',
  service: 'Service',
  due: 'Due',
  status: 'Status',
  createdBy: 'Created by',
  approver: 'Approver',
}

export type ListOp = 'is' | 'is_not'
export interface ListFilter {
  op: ListOp
  values: string[]
}

export type DueOp = 'is' | 'before' | 'after' | 'between'
export type DuePreset = 'overdue' | 'today' | 'this_week' | 'this_month'
export const DUE_PRESETS: { value: DuePreset; label: string }[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
]
export interface DueFilter {
  op: DueOp
  preset?: DuePreset
  from?: string // yyyy-MM-dd
  to?: string // yyyy-MM-dd (only for between)
}

export type SortField = 'due' | 'created' | 'title' | 'client'
export type SortDir = 'asc' | 'desc'
export const SORT_LABELS: Record<SortField, string> = {
  due: 'Due date',
  created: 'Created date',
  title: 'Title',
  client: 'Client',
}

export interface ProjectQuery {
  lists: Partial<Record<ListField, ListFilter>>
  due: DueFilter
  extras: ListField[] // extra filter chips the user added
  assigned: boolean
  approving: boolean
  archived: boolean
  sort: { field: SortField; dir: SortDir }
  q: string
}

export const DEFAULT_SORT = { field: 'created', dir: 'desc' } as const

export const emptyQuery = (): ProjectQuery => ({
  lists: {},
  due: { op: 'is' },
  extras: [],
  assigned: false,
  approving: false,
  archived: false,
  sort: { ...DEFAULT_SORT },
  q: '',
})

export function isDueActive(due: DueFilter) {
  if (due.op === 'is') return !!(due.preset || due.from)
  if (due.op === 'between') return !!(due.from && due.to)
  return !!due.from
}

export function hasActiveFilters(q: ProjectQuery) {
  return (
    Object.values(q.lists).some((f) => f && f.values.length > 0) ||
    isDueActive(q.due) ||
    q.extras.length > 0 ||
    q.assigned ||
    q.approving ||
    q.archived ||
    q.q.trim() !== ''
  )
}

// ---------- URL (de)serialization ----------

const LIST_FIELDS: ListField[] = ['client', 'assignee', 'type', 'service', 'status', 'createdBy', 'approver']

export function queryToParams(q: ProjectQuery): URLSearchParams {
  const p = new URLSearchParams()
  for (const field of LIST_FIELDS) {
    const f = q.lists[field]
    if (f && f.values.length) p.set(field, f.values.join(','))
    if (f && f.op === 'is_not') p.set(`${field}_op`, 'not')
  }
  if (isDueActive(q.due)) {
    if (q.due.op !== 'is') p.set('due_op', q.due.op)
    if (q.due.preset && q.due.op === 'is') p.set('due', q.due.preset)
    else if (q.due.op === 'between') p.set('due', `${q.due.from}..${q.due.to}`)
    else if (q.due.from) p.set('due', q.due.from)
  }
  if (q.extras.length) p.set('extra', q.extras.join(','))
  if (q.assigned) p.set('assigned', '1')
  if (q.approving) p.set('approving', '1')
  if (q.archived) p.set('archived', '1')
  if (q.sort.field !== DEFAULT_SORT.field || q.sort.dir !== DEFAULT_SORT.dir) p.set('sort', `${q.sort.field}:${q.sort.dir}`)
  if (q.q) p.set('q', q.q)
  return p
}

export function paramsToQuery(p: URLSearchParams): ProjectQuery {
  const q = emptyQuery()
  for (const field of LIST_FIELDS) {
    const raw = p.get(field)
    const op: ListOp = p.get(`${field}_op`) === 'not' ? 'is_not' : 'is'
    if (raw || op === 'is_not') q.lists[field] = { op, values: raw ? raw.split(',').filter(Boolean) : [] }
  }
  const dueOp = (p.get('due_op') as DueOp) || 'is'
  const due = p.get('due')
  q.due = { op: ['is', 'before', 'after', 'between'].includes(dueOp) ? dueOp : 'is' }
  if (due) {
    if (q.due.op === 'between') {
      const [from, to] = due.split('..')
      q.due.from = from
      q.due.to = to
    } else if (DUE_PRESETS.some((d) => d.value === due)) {
      q.due.preset = due as DuePreset
    } else {
      q.due.from = due
    }
  }
  q.extras = (p.get('extra') ?? '').split(',').filter((x): x is ListField => (EXTRA_FIELDS as string[]).includes(x))
  q.assigned = p.get('assigned') === '1'
  q.approving = p.get('approving') === '1'
  q.archived = p.get('archived') === '1'
  const [sf, sd] = (p.get('sort') ?? '').split(':')
  if (sf in SORT_LABELS) q.sort = { field: sf as SortField, dir: sd === 'asc' ? 'asc' : 'desc' }
  q.q = p.get('q') ?? ''
  return q
}

// ---------- Filtering ----------

function fieldValue(p: Project, field: ListField): string | undefined {
  switch (field) {
    case 'client':
      return p.clientId
    case 'assignee':
      return p.assigneeId
    case 'type':
      return p.type
    case 'service':
      return p.service
    case 'status':
      return p.status
    case 'createdBy':
      return p.ownerId
    case 'approver':
      return p.approverId
  }
}

function matchesDue(p: Project, due: DueFilter, now = new Date()) {
  if (!isDueActive(due)) return true
  const d = parseISO(p.dueDate)
  if (due.op === 'is' && due.preset) {
    switch (due.preset) {
      case 'overdue':
        return isBefore(d, startOfDay(now)) && p.status !== 'Final Video Accepted'
      case 'today':
        return isSameDay(d, now)
      case 'this_week':
        return isWithinInterval(d, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })
      case 'this_month':
        return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) })
    }
  }
  const from = due.from ? parseISO(due.from) : undefined
  if (!from) return true
  switch (due.op) {
    case 'is':
      return isSameDay(d, from)
    case 'before':
      return isBefore(d, startOfDay(from))
    case 'after':
      return isAfter(d, endOfDay(from))
    case 'between':
      return isWithinInterval(d, { start: startOfDay(from), end: endOfDay(parseISO(due.to!)) })
  }
}

export function filterProjects(
  projects: Project[],
  q: ProjectQuery,
  ctx: { currentUserId: string; clients: Client[] },
): Project[] {
  const search = q.q.trim().toLowerCase()
  const clientName = (id: string) => ctx.clients.find((c) => c.id === id)?.name ?? ''
  const activeFields = new Set<ListField>([...(DEFAULT_FIELDS.filter((f) => f !== 'due') as ListField[]), ...q.extras])

  const result = projects.filter((p) => {
    if (p.archived !== q.archived) return false
    if (q.assigned && p.assigneeId !== ctx.currentUserId) return false
    if (q.approving && p.approverId !== ctx.currentUserId) return false
    for (const field of activeFields) {
      const f = q.lists[field]
      if (!f || f.values.length === 0) continue
      const v = fieldValue(p, field)
      const hit = v !== undefined && f.values.includes(v)
      if (f.op === 'is' ? !hit : hit) return false
    }
    if (!matchesDue(p, q.due)) return false
    if (search) {
      const haystack = `${p.title} ${p.number ?? ''} ${clientName(p.clientId)}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })

  const dir = q.sort.dir === 'asc' ? 1 : -1
  return result.sort((a, b) => {
    switch (q.sort.field) {
      case 'due':
        return a.dueDate.localeCompare(b.dueDate) * dir
      case 'created':
        return a.createdAt.localeCompare(b.createdAt) * dir
      case 'title':
        return a.title.localeCompare(b.title, undefined, { numeric: true }) * dir
      case 'client':
        return clientName(a.clientId).localeCompare(clientName(b.clientId)) * dir
    }
  })
}

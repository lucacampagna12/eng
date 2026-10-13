import { format, parseISO } from 'date-fns'
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  Crown,
  List,
  ListChecks,
  Plus,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import * as React from 'react'
import { Avatar, StatusDot } from '@/components/common'
import { Calendar } from '@/components/ui/calendar'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { useUser } from '@/store/user'
import { CHANNELS, FORMATS, PROJECT_STATUSES, VIDEO_FORMATS, type Project } from '@/types'

type OptionalField = 'format' | 'videoFormat' | 'scheduledAt' | 'channels'
const OPTIONAL_FIELDS: { key: OptionalField; label: string; icon: LucideIcon }[] = [
  { key: 'format', label: 'Format', icon: List },
  { key: 'videoFormat', label: 'Video format', icon: List },
  { key: 'scheduledAt', label: 'Scheduled at', icon: CalendarDays },
  { key: 'channels', label: 'Channel', icon: ListChecks },
]

const EMPTY = '—'
const fmtDateTime = (iso?: string) => (iso ? format(parseISO(iso), 'dd/MM/yyyy HH:mm') : EMPTY)

const hasValue = (p: Project, key: OptionalField) => (key === 'channels' ? p.channels.length > 0 : p[key] !== undefined)

/**
 * Open state for chips that should pop their selector right after being added.
 * Opening a frame after mount lets the popper measure its anchor first (otherwise it renders at 0,0).
 */
function useAutoOpen(autoOpen?: boolean) {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    if (!autoOpen) return
    const raf = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(raf)
  }, [autoOpen])
  return [open, setOpen] as const
}

// ---------- Chip shell ----------

const chipClass =
  'inline-flex h-7 max-w-full items-stretch rounded-lg border border-border bg-elevated text-xs transition-colors duration-150 hover:border-border-strong has-[[data-state=open]]:border-border-strong'
const segment =
  'flex min-w-0 items-center gap-1.5 px-2.5 outline-none transition-colors duration-150 first:rounded-l-[7px] last:rounded-r-[7px] hover:bg-elevated-hover focus-visible:bg-elevated-hover data-[state=open]:bg-elevated-hover [&_svg]:size-3.5 [&_svg]:shrink-0'

function Label({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 text-muted-foreground">{children}</span>
}
function Value({ children, empty }: { children: React.ReactNode; empty?: boolean }) {
  return <span className={cn('truncate font-semibold', empty ? 'font-normal text-subtle-foreground' : 'text-foreground')}>{children}</span>
}
function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Remove ${label}`}
      className="flex items-center rounded-r-[7px] pr-2 pl-1 text-muted-foreground transition-colors duration-150 hover:bg-elevated-hover hover:text-foreground"
    >
      <X className="size-3.5" />
    </button>
  )
}
function MiniAvatar({ name, src }: { name: string; src?: string }) {
  return <Avatar name={name} src={src} size={16} className="text-[8px]" />
}

// ---------- Select (Command list, optionally searchable) ----------

interface Option {
  value: string
  label: string
  prefix?: React.ReactNode
}

function SelectChip({
  icon,
  label,
  value,
  display,
  options,
  onChange,
  searchable,
  showChevrons = true,
  onRemove,
  defaultOpen,
  placeholder = 'Search...',
}: {
  icon?: React.ReactNode
  label?: string
  value: string | undefined
  display: React.ReactNode
  options: Option[]
  onChange: (v: string) => void
  searchable?: boolean
  showChevrons?: boolean
  onRemove?: () => void
  defaultOpen?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useAutoOpen(defaultOpen)
  return (
    <div className={chipClass}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={segment}>
          {icon}
          {label && <Label>{label}:</Label>}
          {display}
          {showChevrons && <ChevronsUpDown className="!size-3 text-muted-foreground" />}
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0">
          <Command>
            {searchable && <CommandInput placeholder={placeholder} />}
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.value}`}
                    onSelect={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                  >
                    {o.prefix}
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.value === value && <Check className="size-3.5" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {onRemove && <RemoveButton label={label ?? ''} onClick={onRemove} />}
    </div>
  )
}

// ---------- Date + time ----------

function DateTimeChip({
  icon,
  label,
  value,
  onChange,
  onRemove,
  defaultOpen,
}: {
  icon: React.ReactNode
  label: string
  value: string | undefined
  onChange: (iso: string) => void
  onRemove?: () => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useAutoOpen(defaultOpen)
  const date = value ? parseISO(value) : undefined
  const time = date ? format(date, 'HH:mm') : '11:00'

  const commit = (day: Date, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(day)
    d.setHours(h || 0, m || 0, 0, 0)
    onChange(d.toISOString())
  }

  return (
    <div className={chipClass}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger aria-label={`${label}: pick date and time`} className={cn(segment, 'group/dt pr-1.5')}>
          {icon}
          <Label>{label}:</Label>
          <Value empty={!date}>{date ? fmtDateTime(value) : 'Pick a date'}</Value>
          <span className="ml-2 flex size-5 items-center justify-center rounded text-muted-foreground transition-colors group-hover/dt:bg-active group-hover/dt:text-foreground">
            <CalendarDays />
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(d) => d && commit(d, time)}
          />
          <div className="flex items-center gap-2 border-t border-border px-3 py-2">
            <span className="text-2xs text-muted-foreground">Time</span>
            <input
              type="time"
              value={time}
              disabled={!date}
              onChange={(e) => date && e.target.value && commit(date, e.target.value)}
              className="h-7 rounded-md border border-border bg-elevated px-2 text-xs text-foreground outline-none focus:border-subtle-foreground disabled:opacity-50 [color-scheme:dark] [:root:not(.dark)_&]:[color-scheme:light]"
            />
          </div>
        </PopoverContent>
      </Popover>
      {onRemove && <RemoveButton label={label} onClick={onRemove} />}
    </div>
  )
}

// ---------- Channels (multi-select) ----------

function ChannelsChip({
  value,
  onChange,
  onRemove,
  defaultOpen,
}: {
  value: string[]
  onChange: (v: string[]) => void
  onRemove: () => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useAutoOpen(defaultOpen)
  const available = CHANNELS.filter((c) => !value.includes(c))
  return (
    <div className={chipClass}>
      <div className="flex min-w-0 items-center gap-1.5 pr-1 pl-2.5">
        <ListChecks className="size-3.5 shrink-0 text-muted-foreground" />
        <Label>Channel:</Label>
        {value.length === 0 && <Value empty>None</Value>}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {value.map((c) => (
            <span key={c} className="inline-flex h-5 items-center gap-0.5 rounded-md bg-elevated-hover pr-0.5 pl-1.5 font-semibold">
              {c}
              <button
                onClick={() => onChange(value.filter((x) => x !== c))}
                aria-label={`Remove ${c}`}
                className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-active hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        {available.length > 0 && (
          <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
            <DropdownMenuTrigger
              aria-label="Add channel"
              className="flex size-5 items-center justify-center rounded text-muted-foreground outline-none hover:bg-elevated-hover hover:text-foreground data-[state=open]:bg-elevated-hover"
            >
              <Plus className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {available.map((c) => (
                <DropdownMenuItem key={c} onSelect={() => onChange([...value, c])}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <RemoveButton label="Channel" onClick={onRemove} />
    </div>
  )
}

// ---------- Chips row ----------

export function FieldChips({ project }: { project: Project }) {
  const { clients, users, updateProject } = useData()
  const me = useUser((s) => s.user)
  // Optional fields added via "+ Add field" that don't have a value yet.
  const [pending, setPending] = React.useState<OptionalField[]>([])
  const [justAdded, setJustAdded] = React.useState<OptionalField>()

  const client = byId(clients, project.clientId)
  const assignee = byId(users, project.assigneeId)
  const owner = byId(users, project.ownerId)
  const userName = (id?: string) => byId(users, id)?.name ?? EMPTY

  /** Saves instantly and records a field_changed notification. */
  const save = (patch: Partial<Project>, field: string, from: string, to: string) => {
    if (from === to) return
    void updateProject(project.id, patch, me?.id ?? '', { field, from, to })
  }

  const visible = OPTIONAL_FIELDS.filter((f) => hasValue(project, f.key) || pending.includes(f.key))
  const addable = OPTIONAL_FIELDS.filter((f) => !visible.some((v) => v.key === f.key))

  const removeField = (key: OptionalField) => {
    setPending((p) => p.filter((k) => k !== key))
    const label = OPTIONAL_FIELDS.find((f) => f.key === key)!.label
    if (key === 'channels') save({ channels: [] }, label, project.channels.join(', ') || EMPTY, EMPTY)
    else if (key === 'scheduledAt') save({ scheduledAt: undefined }, label, fmtDateTime(project.scheduledAt), EMPTY)
    else save({ [key]: undefined }, label, project[key] ?? EMPTY, EMPTY)
  }

  const userOptions = users.map((u) => ({ value: u.id, label: u.name, prefix: <MiniAvatar name={u.name} src={u.avatarUrl} /> }))

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <SelectChip
        icon={<StatusDot status={project.status} className="size-2" />}
        label="Status"
        value={project.status}
        display={<Value>{project.status}</Value>}
        options={PROJECT_STATUSES.map((s) => ({ value: s, label: s, prefix: <StatusDot status={s} /> }))}
        onChange={(v) => save({ status: v as Project['status'] }, 'Status', project.status, v)}
      />
      <DateTimeChip
        icon={<CalendarDays className="text-muted-foreground" />}
        label="Due"
        value={project.dueDate}
        onChange={(iso) => save({ dueDate: iso }, 'Due', fmtDateTime(project.dueDate), fmtDateTime(iso))}
      />
      <SelectChip
        icon={client && <MiniAvatar name={client.name} src={client.avatarUrl} />}
        value={project.clientId}
        display={<Value>{client?.name ?? 'No client'}</Value>}
        showChevrons={false}
        searchable
        placeholder="Search clients..."
        options={clients.map((c) => ({ value: c.id, label: c.name, prefix: <MiniAvatar name={c.name} src={c.avatarUrl} /> }))}
        onChange={(v) => save({ clientId: v }, 'Client', client?.name ?? EMPTY, byId(clients, v)?.name ?? EMPTY)}
      />
      <SelectChip
        icon={<UserRound className="text-muted-foreground" />}
        label="Assignee"
        value={project.assigneeId}
        display={
          <>
            {assignee && <MiniAvatar name={assignee.name} src={assignee.avatarUrl} />}
            <Value>{assignee?.name ?? 'Unassigned'}</Value>
          </>
        }
        searchable
        placeholder="Search users..."
        options={userOptions}
        onChange={(v) => save({ assigneeId: v }, 'Assignee', userName(project.assigneeId), userName(v))}
      />
      <SelectChip
        icon={<Crown className="text-muted-foreground" />}
        label="Owner"
        value={project.ownerId}
        display={
          <>
            {owner && <MiniAvatar name={owner.name} src={owner.avatarUrl} />}
            <Value>{owner?.name ?? EMPTY}</Value>
          </>
        }
        searchable
        placeholder="Search users..."
        options={userOptions}
        onChange={(v) => save({ ownerId: v }, 'Owner', userName(project.ownerId), userName(v))}
      />

      {visible.map(({ key, label }) => {
        const autoOpen = justAdded === key
        switch (key) {
          case 'format':
          case 'videoFormat': {
            const list = key === 'format' ? FORMATS : VIDEO_FORMATS
            const current = list.find((o) => o.value === project[key])
            return (
              <SelectChip
                key={key}
                icon={<List className="text-muted-foreground" />}
                label={label}
                value={project[key]}
                display={<Value empty={!current}>{current?.label ?? 'Select…'}</Value>}
                showChevrons={false}
                defaultOpen={autoOpen}
                options={list.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(v) => save({ [key]: v }, label, project[key] ?? EMPTY, v)}
                onRemove={() => removeField(key)}
              />
            )
          }
          case 'scheduledAt':
            return (
              <DateTimeChip
                key={key}
                icon={<CalendarDays className="text-muted-foreground" />}
                label={label}
                value={project.scheduledAt}
                defaultOpen={autoOpen}
                onChange={(iso) => save({ scheduledAt: iso }, label, fmtDateTime(project.scheduledAt), fmtDateTime(iso))}
                onRemove={() => removeField(key)}
              />
            )
          case 'channels':
            return (
              <ChannelsChip
                key={key}
                value={project.channels}
                defaultOpen={autoOpen}
                onChange={(v) => save({ channels: v }, label, project.channels.join(', ') || EMPTY, v.join(', ') || EMPTY)}
                onRemove={() => removeField(key)}
              />
            )
        }
      })}

      {addable.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground transition-colors duration-150 outline-none hover:bg-hover hover:text-foreground data-[state=open]:bg-hover data-[state=open]:text-foreground">
            <Plus className="size-3.5" />
            Add field
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuLabel>Add field</DropdownMenuLabel>
            {addable.map(({ key, label, icon: Icon }) => (
              <DropdownMenuItem
                key={key}
                onSelect={() => {
                  // Mount the new chip (with its selector open) once the menu has fully closed.
                  setTimeout(() => {
                    setJustAdded(key)
                    setPending((p) => [...p, key])
                  }, 0)
                }}
              >
                <Icon /> {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

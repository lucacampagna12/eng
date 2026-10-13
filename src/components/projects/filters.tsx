import { format, parseISO } from 'date-fns'
import { CalendarDays, Check, ChevronDown, Filter, Plus, X } from 'lucide-react'
import * as React from 'react'
import { Avatar, StatusDot } from '@/components/common'
import { Calendar } from '@/components/ui/calendar'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/misc'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DUE_PRESETS,
  EXTRA_FIELDS,
  FIELD_LABELS,
  isDueActive,
  type DueFilter,
  type DueOp,
  type ListField,
  type ListFilter,
  type ListOp,
} from '@/lib/projectFilters'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types'

export interface FilterOption {
  value: string
  label: string
  avatar?: { name: string; src?: string }
  status?: ProjectStatus
}

// ---------- Shared pieces ----------

const groupClass =
  'flex h-8 items-stretch overflow-hidden rounded-lg border border-border bg-elevated transition-colors duration-150 hover:border-border-strong'

const segmentClass =
  'flex items-center gap-1 text-xs transition-colors duration-150 outline-none hover:bg-elevated-hover focus-visible:bg-elevated-hover data-[state=open]:bg-elevated-hover'

/** Small "Is ▾" operator selector, glued to the left of a filter chip. */
function OperatorSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const current = options.find((o) => o.value === value) ?? options[0]
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={cn(segmentClass, 'border-r border-border pr-1.5 pl-2 text-2xs text-subtle-foreground')}>
        {current.label}
        <ChevronDown className="size-2.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-28">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ChipLabel({ field, value, active }: { field: string; value: string; active: boolean }) {
  return (
    <>
      <Filter className={cn('size-3.5', active ? 'text-accent' : 'text-muted-foreground')} strokeWidth={1.75} />
      <span className="text-foreground">{field}:</span>
      <span className={cn('max-w-36 truncate', active ? 'text-foreground' : 'text-muted-foreground')}>{value}</span>
      <ChevronDown className="size-3 text-muted-foreground" />
    </>
  )
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Remove ${label} filter`}
      className="flex w-6 items-center justify-center border-l border-border text-subtle-foreground transition-colors duration-150 hover:bg-elevated-hover hover:text-foreground"
    >
      <X className="size-3" />
    </button>
  )
}

const LIST_OPS: { value: ListOp; label: string }[] = [
  { value: 'is', label: 'Is' },
  { value: 'is_not', label: 'Is not' },
]

// ---------- Multi-select list filter ----------

export function ListFilterControl({
  field,
  filter,
  options,
  onChange,
  onRemove,
}: {
  field: ListField
  filter: ListFilter | undefined
  options: FilterOption[]
  onChange: (f: ListFilter) => void
  onRemove?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const current = filter ?? { op: 'is' as ListOp, values: [] }
  const selected = current.values
  const label = FIELD_LABELS[field]
  const valueLabel =
    selected.length === 0
      ? 'All'
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? '1 selected')
        : `${selected.length} selected`

  const toggle = (value: string) =>
    onChange({ ...current, values: selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value] })

  return (
    <div className={cn(groupClass, selected.length > 0 && 'border-border-strong')}>
      <OperatorSelect value={current.op} options={LIST_OPS} onChange={(op) => onChange({ ...current, op })} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={cn(segmentClass, 'gap-1.5 px-2.5')}>
          <ChipLabel field={label} value={valueLabel} active={selected.length > 0} />
        </PopoverTrigger>
        <PopoverContent className="w-60 p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const checked = selected.includes(o.value)
                  return (
                    <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => toggle(o.value)}>
                      <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
                      {o.avatar && <Avatar name={o.avatar.name} src={o.avatar.src} size={18} />}
                      {o.status && <StatusDot status={o.status} />}
                      <span className="truncate">{o.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {selected.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={() => onChange({ ...current, values: [] })} className="justify-center text-muted-foreground">
                      Clear selection
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {onRemove && <RemoveButton onClick={onRemove} label={label} />}
    </div>
  )
}

// ---------- Due date filter ----------

const DUE_OPS: { value: DueOp; label: string }[] = [
  { value: 'is', label: 'Is' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
]

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
const pretty = (s: string) => format(parseISO(s), 'MMM d, yyyy')
const short = (s: string) => format(parseISO(s), 'MMM d')

export function dueLabel(due: DueFilter): string {
  if (!isDueActive(due)) return 'All'
  if (due.op === 'is' && due.preset) return DUE_PRESETS.find((p) => p.value === due.preset)!.label
  if (due.op === 'between') return `${short(due.from!)} – ${short(due.to!)}`
  return pretty(due.from!)
}

export function DueFilterControl({ due, onChange }: { due: DueFilter; onChange: (d: DueFilter) => void }) {
  const [open, setOpen] = React.useState(false)
  const active = isDueActive(due)
  // Pending range while the user has picked only the first day.
  const [range, setRange] = React.useState<{ from?: Date; to?: Date } | undefined>()

  React.useEffect(() => {
    if (open) setRange(due.op === 'between' && due.from ? { from: parseISO(due.from), to: due.to ? parseISO(due.to) : undefined } : undefined)
  }, [open, due])

  const setOp = (op: DueOp) => {
    // Keep a single date when switching between single-date operators.
    if (op === 'between') onChange({ op, from: due.from, to: due.to ?? due.from })
    else onChange({ op, from: due.preset ? undefined : due.from })
  }

  return (
    <div className={cn(groupClass, active && 'border-border-strong')}>
      <OperatorSelect value={due.op} options={DUE_OPS} onChange={setOp} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={cn(segmentClass, 'gap-1.5 px-2.5')}>
          <ChipLabel field="Due" value={dueLabel(due)} active={active} />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="flex">
            <div className="flex w-40 flex-col gap-0.5 border-r border-border p-1.5">
              <p className="px-2 pt-1 pb-1.5 text-2xs font-medium text-subtle-foreground">Quick options</p>
              {DUE_PRESETS.map((p) => {
                const isOn = due.op === 'is' && due.preset === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => {
                      onChange(isOn ? { op: 'is' } : { op: 'is', preset: p.value })
                      setOpen(false)
                    }}
                    className={cn(
                      'flex h-7 items-center justify-between rounded-md px-2 text-left text-xs transition-colors duration-150 hover:bg-hover',
                      isOn && 'bg-hover font-medium',
                    )}
                  >
                    {p.label}
                    {isOn && <Check className="size-3.5" />}
                  </button>
                )
              })}
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => onChange({ op: 'between' })}
                className={cn(
                  'flex h-7 items-center gap-2 rounded-md px-2 text-left text-xs transition-colors duration-150 hover:bg-hover',
                  due.op === 'between' && 'bg-hover font-medium',
                )}
              >
                <CalendarDays className="size-3.5 text-muted-foreground" />
                Custom range
              </button>
              {active && (
                <button
                  onClick={() => {
                    onChange({ op: 'is' })
                    setOpen(false)
                  }}
                  className="mt-auto flex h-7 items-center rounded-md px-2 text-left text-xs text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div>
              <p className="px-3.5 pt-2.5 text-2xs font-medium text-subtle-foreground">
                {due.op === 'between'
                  ? 'Pick a start and end date'
                  : due.op === 'before'
                    ? 'Due before'
                    : due.op === 'after'
                      ? 'Due after'
                      : 'Specific date'}
              </p>
              {due.op === 'between' ? (
                <Calendar
                  mode="range"
                  selected={range ? { from: range.from, to: range.to } : undefined}
                  defaultMonth={range?.from}
                  onSelect={(r) => {
                    setRange(r ?? undefined)
                    if (r?.from && r.to && r.from.getTime() !== r.to.getTime()) {
                      onChange({ op: 'between', from: ymd(r.from), to: ymd(r.to) })
                    }
                  }}
                />
              ) : (
                <Calendar
                  mode="single"
                  selected={due.from ? parseISO(due.from) : undefined}
                  defaultMonth={due.from ? parseISO(due.from) : undefined}
                  onSelect={(d) => {
                    onChange(d ? { op: due.op, from: ymd(d) } : { op: due.op })
                    if (d) setOpen(false)
                  }}
                />
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ---------- "+ Filter" ----------

export function AddFilterButton({ active, onAdd }: { active: ListField[]; onAdd: (f: ListField) => void }) {
  const available = EXTRA_FIELDS.filter((f) => !active.includes(f))
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        disabled={available.length === 0}
        className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-border-strong px-2.5 text-xs text-muted-foreground transition-colors duration-150 outline-none hover:border-subtle-foreground hover:bg-hover hover:text-foreground disabled:opacity-40 data-[state=open]:bg-hover"
      >
        <Plus className="size-3.5" />
        Filter
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>Add filter</DropdownMenuLabel>
        {available.map((f) => (
          <DropdownMenuItem key={f} onSelect={() => onAdd(f)}>
            <Filter /> {FIELD_LABELS[f]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

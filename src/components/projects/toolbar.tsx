import { format } from 'date-fns'
import {
  Archive,
  ArchiveRestore,
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Bookmark,
  CalendarDays,
  CircleDot,
  ClipboardList,
  Eye,
  LayoutGrid,
  List,
  ListChecks,
  SquareDashed,
  SquareCheckBig,
  Trash2,
  User,
  UserRoundPen,
  X,
  type LucideIcon,
} from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, StatusDot } from '@/components/common'
import { toast } from '@/components/common/Toaster'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { ConfirmDialog } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Hint, Input } from '@/components/ui/misc'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { queryToParams, SORT_LABELS, type SortField } from '@/lib/projectFilters'
import { cn } from '@/lib/utils'
import { useData } from '@/store/data'
import { CARD_FIELD_LABELS, useProjectsView, type CardField } from '@/store/projectsView'
import { PROJECT_STATUSES } from '@/types'

// ---------- Square icon button ----------

export const ToolbarIconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; active?: boolean }
>(({ icon: Icon, label, active, className, ...props }, ref) => (
  <Hint label={label}>
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-lg border border-border bg-elevated text-foreground transition-colors duration-150 outline-none',
        'hover:border-border-strong hover:bg-elevated-hover focus-visible:border-subtle-foreground data-[state=open]:border-border-strong data-[state=open]:bg-elevated-hover',
        active && 'border-border-strong bg-elevated-hover',
        className,
      )}
      {...props}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </button>
  </Hint>
))
ToolbarIconButton.displayName = 'ToolbarIconButton'

// ---------- Eye: visible card fields ----------

export function FieldsMenu() {
  const { visibleFields, toggleField } = useProjectsView()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarIconButton icon={Eye} label="Display fields" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>Show on cards</DropdownMenuLabel>
        {(Object.keys(CARD_FIELD_LABELS) as CardField[]).map((f) => (
          <DropdownMenuCheckboxItem
            key={f}
            checked={visibleFields[f]}
            onCheckedChange={() => toggleField(f)}
            onSelect={(e) => e.preventDefault()}
          >
            {CARD_FIELD_LABELS[f]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------- Bookmark: saved views ----------

export function SavedViewsMenu() {
  const navigate = useNavigate()
  const { savedViews, saveView, deleteView, query } = useProjectsView()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const currentSearch = queryToParams(query).toString()

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    saveView(name.trim(), currentSearch)
    setName('')
    toast(`Saved view "${name.trim()}"`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarIconButton icon={Bookmark} label="Saved views" active={savedViews.some((v) => v.search === currentSearch)} />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5">
        <p className="px-2 pt-1 pb-1.5 text-2xs font-medium text-subtle-foreground">Saved views</p>
        {savedViews.length === 0 ? (
          <p className="px-2 pb-2 text-xs text-muted-foreground">Save the current filters to get back to them quickly.</p>
        ) : (
          <ul className="mb-1">
            {savedViews.map((v) => (
              <li key={v.id} className="group flex items-center">
                <button
                  onClick={() => {
                    navigate({ search: v.search ? `?${v.search}` : '' })
                    setOpen(false)
                  }}
                  className={cn(
                    'flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-xs transition-colors duration-150 hover:bg-hover',
                    v.search === currentSearch && 'font-medium',
                  )}
                >
                  <Bookmark className={cn('size-3.5 shrink-0 text-muted-foreground', v.search === currentSearch && 'fill-current')} />
                  <span className="truncate">{v.name}</span>
                </button>
                <button
                  onClick={() => deleteView(v.id)}
                  aria-label={`Delete view ${v.name}`}
                  className="flex size-6 items-center justify-center rounded text-subtle-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={save} className="flex gap-1.5 border-t border-border px-0.5 pt-2 pb-0.5">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="View name" className="h-7 text-xs" />
          <Button type="submit" size="sm" variant="primary" disabled={!name.trim()}>
            Save
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

// ---------- Grid / list toggle ----------

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useProjectsView()
  return (
    <ToolbarIconButton
      icon={viewMode === 'grid' ? LayoutGrid : List}
      label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
    />
  )
}

// ---------- Sort ----------

export function SortMenu() {
  const sort = useProjectsView((s) => s.query.sort)
  const setSort = useProjectsView((s) => s.setSort)
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarIconButton icon={ArrowDownUp} label={`Sort: ${SORT_LABELS[sort.field]}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort.field} onValueChange={(f) => setSort(f as SortField, sort.dir)}>
          {(Object.keys(SORT_LABELS) as SortField[]).map((f) => (
            <DropdownMenuRadioItem key={f} value={f} onSelect={(e) => e.preventDefault()}>
              {SORT_LABELS[f]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={sort.dir} onValueChange={(d) => setSort(sort.field, d as 'asc' | 'desc')}>
          <DropdownMenuRadioItem value="asc" onSelect={(e) => e.preventDefault()}>
            <ArrowUpNarrowWide /> Ascending
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc" onSelect={(e) => e.preventDefault()}>
            <ArrowDownWideNarrow /> Descending
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------- Toggle chips ----------

const TOGGLES: { key: 'assigned' | 'approving' | 'archived'; label: string; icon: LucideIcon; hint: string }[] = [
  { key: 'assigned', label: 'Assigned', icon: User, hint: 'Only projects assigned to me' },
  { key: 'approving', label: 'Approving', icon: ClipboardList, hint: "Projects where I'm the approver" },
  { key: 'archived', label: 'Archived', icon: Archive, hint: 'Show archived projects' },
]

export function ToggleChips() {
  const query = useProjectsView((s) => s.query)
  const toggle = useProjectsView((s) => s.toggle)
  return (
    <div className="flex items-center gap-1.5">
      {TOGGLES.map(({ key, label, icon: Icon, hint }) => {
        const on = query[key]
        return (
          <Hint key={key} label={hint}>
            <button
              aria-pressed={on}
              onClick={() => toggle(key)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors duration-150',
                on
                  ? 'border-accent/60 bg-accent-soft text-foreground [&_svg]:text-accent'
                  : 'border-border bg-elevated text-foreground hover:border-border-strong hover:bg-elevated-hover',
              )}
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
              {label}
            </button>
          </Hint>
        )
      })}
    </div>
  )
}

// ---------- Bulk actions ----------

export function BulkActionsMenu({ selected, visibleIds }: { selected: string[]; visibleIds: string[] }) {
  const { users, updateProjects, deleteProjects } = useData()
  const setSelection = useProjectsView((s) => s.setSelection)
  const showingArchived = useProjectsView((s) => s.query.archived)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const count = selected.length
  const noun = `${count} project${count === 1 ? '' : 's'}`

  const apply = async (patch: Parameters<typeof updateProjects>[1], message: string, clear = false) => {
    await updateProjects(selected, patch)
    toast(message)
    if (clear) setSelection([])
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="md" disabled={count === 0} className="h-8 gap-2 rounded-lg text-xs font-normal disabled:opacity-100 disabled:text-muted-foreground [&_svg]:size-3.5">
            <ListChecks strokeWidth={1.75} />
            Bulk Actions
            {count > 0 && (
              <span className="-mr-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{count > 0 ? `${noun} selected` : 'Select projects to use bulk actions'}</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!count}>
              <CircleDot /> Change status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {PROJECT_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => apply({ status: s }, `Status set to ${s} for ${noun}`)}>
                  <StatusDot status={s} className="mx-1" /> {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!count}>
              <UserRoundPen /> Reassign
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {users.map((u) => (
                <DropdownMenuItem key={u.id} onSelect={() => apply({ assigneeId: u.id }, `Reassigned ${noun} to ${u.name}`)}>
                  <Avatar name={u.name} src={u.avatarUrl} size={18} /> {u.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!count}>
              <CalendarDays /> Change due date
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-auto p-0">
              <Calendar
                mode="single"
                onSelect={(d) => {
                  if (!d) return
                  d.setHours(11)
                  void apply({ dueDate: d.toISOString() }, `Due date set to ${format(d, 'MMM d, yyyy')} for ${noun}`)
                }}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            disabled={!count}
            onSelect={() =>
              apply({ archived: !showingArchived }, `${showingArchived ? 'Restored' : 'Archived'} ${noun}`, true)
            }
          >
            {showingArchived ? <ArchiveRestore /> : <Archive />}
            {showingArchived ? 'Unarchive' : 'Archive'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={visibleIds.length === 0} onSelect={() => setSelection(visibleIds)}>
            <SquareCheckBig /> Select all ({visibleIds.length})
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!count} onSelect={() => setSelection([])}>
            <SquareDashed /> Clear selection
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive disabled={!count} onSelect={() => setConfirmOpen(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${noun}?`}
        description="The selected projects and their content will be permanently removed. This can't be undone."
        confirmLabel={`Delete ${noun}`}
        onConfirm={async () => {
          await deleteProjects(selected)
          setSelection([])
          toast(`Deleted ${noun}`)
        }}
      />
    </>
  )
}

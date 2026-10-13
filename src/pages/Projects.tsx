import { FolderSearch, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, PageHeader } from '@/components/common'
import { NewProjectDialog } from '@/components/home/dialogs'
import { AddFilterButton, DueFilterControl, ListFilterControl, type FilterOption } from '@/components/projects/filters'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectListHeader, ProjectRow } from '@/components/projects/ProjectRow'
import {
  BulkActionsMenu,
  FieldsMenu,
  SavedViewsMenu,
  SortMenu,
  ToggleChips,
  ViewModeToggle,
} from '@/components/projects/toolbar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { useProjectQuerySync } from '@/hooks/useProjectQuerySync'
import { canCreateProjects } from '@/lib/permissions'
import { filterProjects, hasActiveFilters, isDueActive, type ListField } from '@/lib/projectFilters'
import { useData } from '@/store/data'
import { useProjectsView } from '@/store/projectsView'
import { useUser } from '@/store/user'
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/types'

const BASE_LIST_FIELDS: ListField[] = ['client', 'assignee', 'type', 'service']

export function ProjectsPage() {
  useProjectQuerySync()
  const { projects, clients, users, loaded } = useData()
  const me = useUser((s) => s.user)
  const { query, setList, setDue, addExtra, removeExtra, setSearch, clearFilters, viewMode, visibleFields, selection, toggleSelected } =
    useProjectsView()

  const options = useMemo<Record<ListField, FilterOption[]>>(() => {
    const userOptions = users.map((u) => ({ value: u.id, label: u.name, avatar: { name: u.name, src: u.avatarUrl } }))
    return {
      client: clients.map((c) => ({ value: c.id, label: c.name, avatar: { name: c.name, src: c.avatarUrl } })),
      assignee: userOptions,
      createdBy: userOptions,
      approver: userOptions,
      type: PROJECT_TYPES.map((t) => ({ value: t, label: t })),
      service: [...new Set(projects.map((p) => p.service))].sort().map((s) => ({ value: s, label: s })),
      status: PROJECT_STATUSES.map((s) => ({ value: s, label: s, status: s })),
    }
  }, [clients, users, projects])

  const visible = useMemo(
    () => filterProjects(projects, query, { currentUserId: me?.id ?? '', clients }),
    [projects, query, me, clients],
  )
  const visibleIds = useMemo(() => visible.map((p) => p.id), [visible])
  // Bulk actions only ever apply to selected cards that are currently visible.
  const selected = useMemo(() => selection.filter((id) => visibleIds.includes(id)), [selection, visibleIds])
  const filtersActive = hasActiveFilters(query)
  const activeCount = Object.values(query.lists).filter((f) => f && f.values.length > 0).length + (isDueActive(query.due) ? 1 : 0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  const filterControls = (
    <>
      {BASE_LIST_FIELDS.map((field) => (
        <ListFilterControl key={field} field={field} filter={query.lists[field]} options={options[field]} onChange={(f) => setList(field, f)} />
      ))}
      <DueFilterControl due={query.due} onChange={setDue} />
      {query.extras.map((field) => (
        <ListFilterControl
          key={field}
          field={field}
          filter={query.lists[field]}
          options={options[field]}
          onChange={(f) => setList(field, f)}
          onRemove={() => removeExtra(field)}
        />
      ))}
      <AddFilterButton active={query.extras} onAdd={addExtra} />
      {filtersActive && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
          <X /> Clear filters
        </Button>
      )}
    </>
  )

  return (
    <>
      <PageHeader title="Projects">
        {/* Only the admin and managers create projects (also enforced by RLS). */}
        {canCreateProjects(me) && (
          <Button variant="primary" size="sm" onClick={() => setNewProjectOpen(true)} className="mr-2 ml-auto rounded-lg md:mr-[26px]">
            <Plus /> New Project
          </Button>
        )}
      </PageHeader>
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <div className="flex flex-col px-4 pt-3 pb-10 md:px-[34px] md:pt-[17px]">
        {/* Row 1: view controls + toggles + bulk actions */}
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
          <div className="flex shrink-0 items-center gap-1.5">
            <FieldsMenu />
            <SavedViewsMenu />
            <ViewModeToggle />
            <SortMenu />
          </div>
          <div className="mx-1 h-5 w-px shrink-0 bg-border" />
          <ToggleChips />
          <div className="ml-auto shrink-0">
            <BulkActionsMenu selected={selected} visibleIds={visibleIds} />
          </div>
        </div>

        {/* Row 2: filters inline on desktop; on phones a "Filters" button opens them in a sheet */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2">
          <div className="contents max-md:hidden">{filterControls}</div>
          <Button size="md" onClick={() => setFiltersOpen(true)} className="h-[30px] rounded-lg text-xs md:hidden">
            <SlidersHorizontal /> Filters
            {activeCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
          <div className="relative min-w-0 flex-1 md:ml-auto md:w-[230px] md:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle-foreground" />
            <input
              value={query.q}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search projects"
              className="h-[30px] w-full rounded-lg border border-border bg-transparent pr-7 pl-8 text-xs text-foreground transition-colors duration-150 outline-none placeholder:text-subtle-foreground hover:border-border-strong focus:border-subtle-foreground "
            />
            {query.q && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-subtle-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>All filters are combined.</DialogDescription>
            <div className="mt-4 flex flex-wrap gap-2">{filterControls}</div>
            <DialogFooter>
              <Button size="md" onClick={() => setFiltersOpen(false)} variant="primary" className="w-full">
                Show {visible.length} project{visible.length === 1 ? '' : 's'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Results */}
        <div className="mt-[11px]">
          {!loaded ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="h-[262px] animate-pulse rounded-xl border border-border bg-surface-sunken" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={FolderSearch}
              title={query.archived ? 'No archived projects' : 'No projects found'}
              description={filtersActive ? 'Try adjusting or clearing your filters.' : 'Projects you create will appear here.'}
              action={
                filtersActive && (
                  <Button size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )
              }
              className="py-28"
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visible.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  fields={visibleFields}
                  selected={selected.includes(p.id)}
                  onToggleSelect={() => toggleSelected(p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface-sunken">
              <div className="min-w-[900px]">
                <ProjectListHeader fields={visibleFields} />
                {visible.map((p) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    fields={visibleFields}
                    selected={selected.includes(p.id)}
                    onToggleSelect={() => toggleSelected(p.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {loaded && visible.length > 0 && (
            <p className="mt-4 text-xs text-subtle-foreground">
              {visible.length} project{visible.length === 1 ? '' : 's'}
              {selected.length > 0 && ` · ${selected.length} selected`}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

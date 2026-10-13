import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  emptyQuery,
  type DueFilter,
  type ListField,
  type ListFilter,
  type ProjectQuery,
  type SortDir,
  type SortField,
} from '@/lib/projectFilters'

export type CardField = 'client' | 'status' | 'service' | 'assignee' | 'dueDate'
export const CARD_FIELD_LABELS: Record<CardField, string> = {
  client: 'Client',
  status: 'Status',
  service: 'Service',
  assignee: 'Assignee',
  dueDate: 'Due date',
}

export interface SavedView {
  id: string
  name: string
  search: string // serialized query params
}

interface ProjectsViewState {
  query: ProjectQuery
  setQuery: (q: ProjectQuery) => void
  setList: (field: ListField, filter: ListFilter) => void
  setDue: (due: DueFilter) => void
  addExtra: (field: ListField) => void
  removeExtra: (field: ListField) => void
  toggle: (key: 'assigned' | 'approving' | 'archived') => void
  setSort: (field: SortField, dir: SortDir) => void
  setSearch: (q: string) => void
  clearFilters: () => void

  selection: string[]
  toggleSelected: (id: string) => void
  setSelection: (ids: string[]) => void

  // persisted preferences
  viewMode: 'grid' | 'list'
  setViewMode: (m: 'grid' | 'list') => void
  visibleFields: Record<CardField, boolean>
  toggleField: (f: CardField) => void
  savedViews: SavedView[]
  saveView: (name: string, search: string) => void
  deleteView: (id: string) => void
}

export const useProjectsView = create<ProjectsViewState>()(
  persist(
    (set) => ({
      query: emptyQuery(),
      setQuery: (query) => set({ query }),
      setList: (field, filter) => set((s) => ({ query: { ...s.query, lists: { ...s.query.lists, [field]: filter } } })),
      setDue: (due) => set((s) => ({ query: { ...s.query, due } })),
      addExtra: (field) =>
        set((s) => ({ query: { ...s.query, extras: s.query.extras.includes(field) ? s.query.extras : [...s.query.extras, field] } })),
      removeExtra: (field) =>
        set((s) => {
          const lists = { ...s.query.lists }
          delete lists[field]
          return { query: { ...s.query, lists, extras: s.query.extras.filter((f) => f !== field) } }
        }),
      toggle: (key) => set((s) => ({ query: { ...s.query, [key]: !s.query[key] }, selection: [] })),
      setSort: (field, dir) => set((s) => ({ query: { ...s.query, sort: { field, dir } } })),
      setSearch: (q) => set((s) => ({ query: { ...s.query, q } })),
      clearFilters: () => set((s) => ({ query: { ...emptyQuery(), sort: s.query.sort } })),

      selection: [],
      toggleSelected: (id) =>
        set((s) => ({ selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id] })),
      setSelection: (selection) => set({ selection }),

      viewMode: 'grid',
      setViewMode: (viewMode) => set({ viewMode }),
      visibleFields: { client: true, status: true, service: true, assignee: true, dueDate: true },
      toggleField: (f) => set((s) => ({ visibleFields: { ...s.visibleFields, [f]: !s.visibleFields[f] } })),
      savedViews: [],
      saveView: (name, search) =>
        set((s) => ({ savedViews: [...s.savedViews, { id: crypto.randomUUID(), name, search }] })),
      deleteView: (id) => set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) })),
    }),
    {
      name: 'projects-view',
      partialize: (s) => ({ viewMode: s.viewMode, visibleFields: s.visibleFields, savedViews: s.savedViews }),
    },
  ),
)

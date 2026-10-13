# Content Hub

Project management web app for a video content agency. React + Vite + TypeScript, Tailwind v4, shadcn-style components (Radix + cmdk), Zustand, react-router, date-fns.

```bash
npm install
npm run dev
```

## Structure

- `reference/`: design captures the UI was matched against (home, projects, notifications, account, project detail).
- `src/index.css`: design tokens (CSS variables) for dark (default) and light mode.
- `src/types.ts`: data model.
- `src/data/`: deterministic mock data (6 clients, 5 users, 41 projects, 42 notifications).
- `src/services/`: async data layer (`getProjects()`, `getNotifications()`, `updateProjects()`…). Swap this for Supabase without touching components.
- `src/store/`: Zustand stores (data, notifications, user/theme, projects view: filters, selection, saved views).
- `src/lib/projectFilters.ts`: filter/sort logic plus URL (de)serialization for the Projects page.
- `src/components/ui/`: Button, Popover, DropdownMenu, Command, Checkbox, Switch, Tooltip, Tabs, Input, Dialog, Calendar.

## Projects URL params

`client`, `assignee`, `type`, `service`, `status`, `createdBy`, `approver` take comma-separated ids, plus `<field>_op=not` for "Is not".
`due` takes a preset (`overdue|today|this_week|this_month`), a date (`2026-10-05`, with `due_op=before|after`) or a range (`2026-10-01..2026-10-10`, with `due_op=between`).
The other params are `extra` (added filter chips), `assigned=1`, `approving=1`, `archived=1`, `sort=due:asc` and `q`.

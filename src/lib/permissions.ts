import type { Role, User } from '@/types'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  editor: 'Editor',
  client: 'Client',
}

type Who = User | null | undefined

export const isAdmin = (u: Who) => u?.role === 'admin'

/** Mirrors private.can_create_projects() in the database (RLS enforces it server-side). */
export const canCreateProjects = (u: Who) => u?.role === 'admin' || u?.role === 'manager'

import type { User } from '@/types'

export const CURRENT_USER_ID = 'u1'

export const users: User[] = [
  { id: 'u1', name: 'luca', email: 'luca@example.com', role: 'admin' },
  { id: 'u2', name: 'Sofía Herrera', email: 'sofia.herrera@example.com', role: 'editor' },
  { id: 'u3', name: 'Martín Ríos', email: 'martin.rios@example.com', role: 'editor' },
  { id: 'u4', name: 'Valentina Cruz', email: 'valentina.cruz@example.com', role: 'manager' },
  { id: 'u5', name: 'Diego Paredes', email: 'diego.paredes@example.com', role: 'editor' },
]

import type { Notification, NotificationPayload, NotificationType } from '@/types'
import { projects } from './projects'
import { createRandom, minutesAgo } from './seed'

const rand = createRandom(7)

const TYPES: NotificationType[] = [
  'content_uploaded',
  'content_uploaded',
  'content_uploaded',
  'field_changed',
  'field_changed',
  'approval_approved',
  'approval_approved',
  'approval_rejected',
  'project_created',
]

const FIELD_CHANGES: Required<NotificationPayload>[] = [
  { field: 'Format', from: 'talking_head', to: 'qa' },
  { field: 'Format', from: 'qa', to: 'b_roll' },
  { field: 'Status', from: 'New', to: 'In Progress' },
  { field: 'Status', from: 'In Review', to: 'Approved' },
  { field: 'Video format', from: 'Horizontal', to: 'Vertical' },
  { field: 'Channel', from: 'TikTok', to: 'Instagram' },
  { field: 'Due date', from: 'Oct 12', to: 'Oct 15' },
]

// Notifications come in bursts: several events from the same person around the same time.
let minutes = 35
export const notifications: Notification[] = Array.from({ length: 42 }, (_, i) => {
  minutes += rand.chance(0.6) ? rand.int(1, 12) : rand.int(60, 420)
  const type = rand.pick(TYPES)
  const project = rand.pick(projects)
  return {
    id: `n${i + 1}`,
    actorId: rand.pick(['u2', 'u2', 'u3', 'u4', 'u5']),
    type,
    projectId: project.id,
    payload: type === 'field_changed' ? rand.pick(FIELD_CHANGES) : {},
    createdAt: minutesAgo(minutes),
    seen: i > 27 ? true : rand.chance(0.1),
  }
})

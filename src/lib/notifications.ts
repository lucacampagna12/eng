import type { Notification, Project } from '@/types'

export function notificationMessage(n: Notification, project?: Project): string {
  const ref = project?.title ?? 'a deleted project'
  switch (n.type) {
    case 'project_created':
      return `Created project ${ref}`
    case 'content_uploaded':
      return `Content for ${ref}`
    case 'field_changed':
      return `Changed ${n.payload.field}: ${n.payload.from} → ${n.payload.to} for ${ref}`
    case 'approval_requested':
      return `Requested approval in ${ref}`
    case 'approval_approved':
      return `Approval Item approved in ${ref}`
    case 'approval_rejected':
      return `Changes requested in ${ref}`
  }
}

export type Role = 'admin' | 'editor' | 'manager' | 'client'

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: Role
}

export interface Client {
  id: string
  name: string
  avatarUrl?: string
}

export const PROJECT_STATUSES = [
  'New',
  'In Progress',
  'In Review',
  'Changes Requested',
  'Approved',
  'Final Video Accepted',
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_TYPES = ['Organic', 'Ads', 'UGC', 'Podcast', 'Long Form'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const FORMATS = [
  { value: 'talking_head', label: 'Talking Head' },
  { value: 'qa', label: 'Q&A' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'b_roll', label: 'B-Roll' },
  { value: 'vlog', label: 'Vlog' },
] as const

export const VIDEO_FORMATS = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'square', label: 'Square' },
] as const

export const CHANNELS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'LinkedIn', 'X'] as const

export interface Project {
  id: string
  number?: number
  title: string
  clientId: string
  status: ProjectStatus
  type: ProjectType
  service: string
  assigneeId: string
  approverId?: string
  ownerId: string // user who created the project
  dueDate: string // ISO (date + time)
  createdAt: string // ISO
  updatedAt: string // ISO
  archived: boolean
  // Optional fields (undefined = not added to the project)
  format?: string
  videoFormat?: string
  scheduledAt?: string // ISO
  channels: string[]
  script: string
}

export type MediaKind = 'video' | 'image' | 'audio'

export interface MediaItem {
  id: string
  projectId: string
  kind: MediaKind
  name: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
  durationSec?: number
  url: string
  thumbnailUrl?: string
  uploadedBy: string
  createdAt: string
}

export type NotificationType =
  | 'project_created'
  | 'content_uploaded'
  | 'field_changed'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'

export interface NotificationPayload {
  field?: string
  from?: string
  to?: string
}

export interface Notification {
  id: string
  actorId: string
  type: NotificationType
  projectId: string
  payload: NotificationPayload
  createdAt: string
  seen: boolean
}

export interface Task {
  id: string
  title: string
  projectId: string
  assigneeId: string
  done: boolean
}

export type ApprovalDirection = 'received' | 'sent'
export type ApprovalStatus = 'pending' | 'approved' | 'changes_requested'
export type ApprovalScope = 'all' | 'content' | 'media'

/** A team member (user) or a client contact who must sign off. */
export interface ApproverRef {
  kind: 'user' | 'client'
  id: string
}

export interface ApprovalDecision {
  approver: ApproverRef
  decision: 'approved' | 'changes_requested'
  at: string
}

export interface Approval {
  id: string
  projectId: string
  scope: ApprovalScope
  /** Whether the project overview (script + fields) is part of the review. */
  includeContent: boolean
  mediaIds: string[]
  requestedBy: string
  /** Approvers in the order they must sign off. */
  approvers: ApproverRef[]
  decisions: ApprovalDecision[]
  status: ApprovalStatus
  statusAfterApproval?: ProjectStatus
  expiresAt?: string
  note?: string
  createdAt: string
}

/** Item key used in review comments for the project overview (otherwise a media id). */
export const CONTENT_ITEM = 'content'

export interface DrawingStroke {
  color: string
  width: number // relative to the frame width (0–1)
  points: [number, number][] // normalized 0–1 coordinates
}

export interface Attachment {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  url: string
}

export interface ApprovalComment {
  id: string
  approvalId: string
  itemId?: string // undefined = general comment on the whole approval
  authorId: string
  body: string
  createdAt: string
  timestampSec?: number
  drawing?: DrawingStroke[]
  attachments: Attachment[]
}

export interface TeamMember {
  userId: string
}

export interface Message {
  id: string
  authorId: string
  body: string
  createdAt: string
  read: boolean
}

export interface NotificationPreferences {
  project_created: boolean
  content_uploaded: boolean
  field_changed: boolean
  approval_requested: boolean
  approval_approved: boolean
  approval_rejected: boolean
}

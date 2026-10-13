import type { Approval, ApprovalStatus, ApproverRef, Client, MediaItem, User } from '@/types'
import { CONTENT_ITEM } from '@/types'

export const sameApprover = (a: ApproverRef, b: ApproverRef) => a.kind === b.kind && a.id === b.id

/** The approver whose turn it is (approvers sign off in order), if the approval is still open. */
export function currentApprover(a: Approval): ApproverRef | undefined {
  if (a.status !== 'pending') return undefined
  return a.approvers.find((ap) => !a.decisions.some((d) => sameApprover(d.approver, ap) && d.decision === 'approved'))
}

export const isUserApprover = (a: Approval, userId: string) => a.approvers.some((ap) => ap.kind === 'user' && ap.id === userId)

export function approverName(ref: ApproverRef, users: User[], clients: Client[]) {
  return (ref.kind === 'user' ? users.find((u) => u.id === ref.id)?.name : clients.find((c) => c.id === ref.id)?.name) ?? 'Unknown'
}

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: 'In Review',
  approved: 'Approved',
  changes_requested: 'Changes Requested',
}

export const APPROVAL_STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending: '#eab308',
  approved: '#34d399',
  changes_requested: '#f87171',
}

export type ReviewItem = { key: string; kind: 'content'; name: string } | { key: string; kind: 'media'; name: string; media: MediaItem }

/** Ordered list of things under review: the project overview first (if included), then media. */
export function reviewItems(a: Approval, media: MediaItem[]): ReviewItem[] {
  const items: ReviewItem[] = []
  if (a.includeContent) items.push({ key: CONTENT_ITEM, kind: 'content', name: 'Project Overview' })
  for (const id of a.mediaIds) {
    const m = media.find((x) => x.id === id)
    if (m) items.push({ key: m.id, kind: 'media', name: m.name, media: m })
  }
  return items
}

export const approvalLink = (id: string) => `${window.location.origin}/approvals/${id}`

import type { Approval, Message, Task, TeamMember } from '@/types'
import { daysFromToday } from './seed'

export const tasks: Task[] = [
  { id: 't1', title: 'Write hooks for next batch', projectId: 'p12', assigneeId: 'u1', done: false },
  { id: 't2', title: 'Review color grade', projectId: 'p14', assigneeId: 'u1', done: false },
  { id: 't3', title: 'Upload raw footage', projectId: 'p23', assigneeId: 'u1', done: true },
  { id: 't4', title: 'Send captions to client', projectId: 'p10', assigneeId: 'u1', done: false },
  { id: 't5', title: 'Cut 3 teaser clips', projectId: 'p3', assigneeId: 'u2', done: false },
  { id: 't6', title: 'Fix audio levels', projectId: 'p20', assigneeId: 'u5', done: false },
]

const seedApproval = (
  id: string,
  projectId: string,
  requestedBy: string,
  approverId: string,
  status: Approval['status'],
  daysAgo: number,
): Approval => ({
  id,
  projectId,
  scope: 'content',
  includeContent: true,
  mediaIds: [],
  requestedBy,
  approvers: [{ kind: 'user', id: approverId }],
  decisions: status === 'approved' ? [{ approver: { kind: 'user', id: approverId }, decision: 'approved', at: daysFromToday(-daysAgo + 1) }] : [],
  status,
  statusAfterApproval: 'Approved',
  createdAt: daysFromToday(-daysAgo),
})

export const approvals: Approval[] = [
  seedApproval('a1', 'p14', 'u3', 'u1', 'pending', 1),
  seedApproval('a2', 'p17', 'u5', 'u1', 'pending', 2),
  seedApproval('a3', 'p36', 'u2', 'u1', 'pending', 3),
  seedApproval('a4', 'p11', 'u1', 'u4', 'pending', 1),
  seedApproval('a5', 'p25', 'u1', 'u4', 'approved', 6),
]

export const team: TeamMember[] = [{ userId: 'u2' }, { userId: 'u3' }, { userId: 'u4' }, { userId: 'u5' }]

export const messages: Message[] = []

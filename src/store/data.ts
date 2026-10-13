import { create } from 'zustand'
import * as api from '@/services'
import type { Approval, ApprovalComment, ApprovalDecision, ApproverRef, Client, MediaItem, Message, NotificationPayload, Project, Task, TeamMember, User } from '@/types'
import { useNotifications } from './notifications'

interface DataState {
  loaded: boolean
  users: User[]
  clients: Client[]
  projects: Project[]
  tasks: Task[]
  approvals: Approval[]
  team: TeamMember[]
  messages: Message[]
  media: MediaItem[]
  approvalComments: ApprovalComment[]
  load: () => Promise<void>
  createClient: (name: string) => Promise<Client>
  createProject: (input: Parameters<typeof api.createProject>[0]) => Promise<Project>
  updateProjects: (ids: string[], patch: Partial<Project>) => Promise<void>
  duplicateProject: (id: string) => Promise<void>
  deleteProjects: (ids: string[]) => Promise<void>
  /** Update one project; `change` (when given) is recorded as a field_changed notification. */
  updateProject: (id: string, patch: Partial<Project>, actorId: string, change?: Required<NotificationPayload>) => Promise<void>
  uploadMedia: (input: api.UploadMediaInput, onProgress?: (p: number) => void) => Promise<MediaItem>
  deleteMedia: (id: string) => Promise<void>
  createApproval: (input: api.NewApprovalInput) => Promise<Approval>
  addApprovalItems: (approvalId: string, mediaIds: string[]) => Promise<void>
  decideApproval: (approvalId: string, approver: ApproverRef, decision: ApprovalDecision['decision'], actorId: string) => Promise<void>
  addApprovalComment: (input: api.NewCommentInput) => Promise<ApprovalComment>
  deleteApprovalComment: (id: string) => Promise<void>
  createTask: (input: Parameters<typeof api.createTask>[0]) => Promise<void>
  toggleTask: (id: string) => Promise<void>
}

const mergeProjects = (list: Project[], updated: Project[]) =>
  list.map((p) => updated.find((u) => u.id === p.id) ?? p)

export const useData = create<DataState>((set, get) => ({
  loaded: false,
  users: [],
  clients: [],
  projects: [],
  tasks: [],
  approvals: [],
  team: [],
  messages: [],
  media: [],
  approvalComments: [],

  load: async () => {
    if (get().loaded) return
    const [users, clients, projects, tasks, approvals, team, messages, media, approvalComments] = await Promise.all([
      api.getUsers(),
      api.getClients(),
      api.getProjects(),
      api.getTasks(),
      api.getApprovals(),
      api.getTeam(),
      api.getMessages(),
      api.getMedia(),
      api.getApprovalComments(),
    ])
    set({ users, clients, projects, tasks, approvals, team, messages, media, approvalComments, loaded: true })
  },

  createClient: async (name) => {
    const created = await api.createClient(name)
    set((s) => ({ clients: [...s.clients, created].sort((a, b) => a.name.localeCompare(b.name)) }))
    return created
  },
  createProject: async (input) => {
    const project = await api.createProject(input)
    set((s) => ({ projects: [...s.projects, project] }))
    return project
  },
  updateProjects: async (ids, patch) => {
    // Optimistic update, then reconcile with the service response.
    set((s) => ({ projects: s.projects.map((p) => (ids.includes(p.id) ? { ...p, ...patch } : p)) }))
    const updated = await api.updateProjects(ids, patch)
    set((s) => ({ projects: mergeProjects(s.projects, updated) }))
  },
  duplicateProject: async (id) => {
    const project = await api.duplicateProject(id)
    set((s) => ({ projects: [...s.projects, project] }))
  },
  deleteProjects: async (ids) => {
    set((s) => ({ projects: s.projects.filter((p) => !ids.includes(p.id)) }))
    await api.deleteProjects(ids)
  },
  updateProject: async (id, patch, actorId, change) => {
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
    const { project, notification } = await api.updateProject(id, patch, { actorId, change })
    set((s) => ({ projects: mergeProjects(s.projects, [project]) }))
    if (notification) useNotifications.getState().add(notification)
  },
  uploadMedia: async (input, onProgress) => {
    const { item, notification } = await api.uploadMedia(input, onProgress)
    set((s) => ({
      media: [...s.media, item],
      projects: s.projects.map((p) => (p.id === item.projectId ? { ...p, updatedAt: item.createdAt } : p)),
    }))
    useNotifications.getState().add(notification)
    return item
  },
  deleteMedia: async (id) => {
    set((s) => ({ media: s.media.filter((m) => m.id !== id) }))
    await api.deleteMedia(id)
  },
  createApproval: async (input) => {
    const { approval, notification } = await api.createApproval(input)
    set((s) => ({ approvals: [...s.approvals, approval] }))
    useNotifications.getState().add(notification)
    return approval
  },
  addApprovalItems: async (approvalId, mediaIds) => {
    const approval = await api.addApprovalItems(approvalId, mediaIds)
    set((s) => ({ approvals: s.approvals.map((a) => (a.id === approval.id ? approval : a)) }))
  },
  decideApproval: async (approvalId, approver, decision, actorId) => {
    const { approval, project, notification } = await api.decideApproval(approvalId, approver, decision, actorId)
    set((s) => ({
      approvals: s.approvals.map((a) => (a.id === approval.id ? approval : a)),
      projects: project ? mergeProjects(s.projects, [project]) : s.projects,
    }))
    if (notification) useNotifications.getState().add(notification)
  },
  addApprovalComment: async (input) => {
    const comment = await api.addApprovalComment(input)
    set((s) => ({ approvalComments: [...s.approvalComments, comment] }))
    return comment
  },
  deleteApprovalComment: async (id) => {
    set((s) => ({ approvalComments: s.approvalComments.filter((c) => c.id !== id) }))
    await api.deleteApprovalComment(id)
  },
  createTask: async (input) => {
    const task = await api.createTask(input)
    set((s) => ({ tasks: [...s.tasks, task] }))
  },
  toggleTask: async (id) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))
    await api.toggleTask(id)
  },
}))

/** Lookup helpers built from the store (memo-free; lists are tiny). */
export const byId = <T extends { id: string }>(list: T[], id: string | undefined) =>
  id ? list.find((x) => x.id === id) : undefined

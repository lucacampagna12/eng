/**
 * Data access layer. Every function is async and returns plain copies so the
 * mock implementation can later be swapped for Supabase without touching components.
 *
 * Mock persistence: records live in localStorage and file blobs in IndexedDB, so the
 * data (and shared approval links) survive a refresh and open in other tabs.
 */
import { currentApprover, sameApprover } from '@/lib/approvals'
import { blobStore } from '@/lib/blobStore'
import { clients as seedClients } from '@/data/clients'
import { approvals as seedApprovals, messages as seedMessages, tasks as seedTasks, team as seedTeam } from '@/data/misc'
import { notifications as seedNotifications } from '@/data/notifications'
import { projects as seedProjects } from '@/data/projects'
import { CURRENT_USER_ID, users as seedUsers } from '@/data/users'
import type {
  Approval,
  ApprovalComment,
  ApprovalDecision,
  ApproverRef,
  Attachment,
  Client,
  MediaItem,
  Message,
  Notification,
  NotificationPayload,
  NotificationType,
  NotificationPreferences,
  Project,
  Task,
  Role,
  TeamMember,
  User,
} from '@/types'

const STORAGE_KEY = 'eng-db-v2'

const seedDb = () => ({
  users: structuredClone(seedUsers),
  clients: structuredClone(seedClients),
  projects: structuredClone(seedProjects),
  notifications: structuredClone(seedNotifications),
  tasks: structuredClone(seedTasks),
  approvals: structuredClone(seedApprovals),
  team: structuredClone(seedTeam),
  messages: structuredClone(seedMessages),
  media: [] as MediaItem[],
  approvalComments: [] as ApprovalComment[],
  preferences: {
    project_created: true,
    content_uploaded: true,
    field_changed: true,
    approval_requested: true,
    approval_approved: true,
    approval_rejected: true,
  } as NotificationPreferences,
})

type Db = ReturnType<typeof seedDb>

function loadDb(): Db {
  const seeded = seedDb()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...seeded, ...(JSON.parse(raw) as Partial<Db>) }
  } catch {
    /* storage unavailable or corrupted: start from seeds */
  }
  return seeded
}

const db: Db = loadDb()

let saveQueued = false
/** Debounced write of all records (blob URLs are session-only and get rebuilt on load). */
function persist() {
  if (saveQueued) return
  saveQueued = true
  queueMicrotask(() => {
    saveQueued = false
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      /* quota exceeded or storage unavailable: keep working in memory */
    }
  })
}

// Object URLs from a previous session are dead; recreate them from IndexedDB once per session.
let hydrated: Promise<void> | undefined
function hydrateBlobs() {
  hydrated ??= (async () => {
    await Promise.all([
      ...db.media.map(async (m) => {
        const blob = await blobStore.get(m.id)
        m.url = blob ? URL.createObjectURL(blob) : ''
      }),
      ...db.approvalComments.flatMap((c) =>
        c.attachments.map(async (a) => {
          const blob = await blobStore.get(a.id)
          a.url = blob ? URL.createObjectURL(blob) : ''
        }),
      ),
    ])
  })()
  return hydrated
}

/** Wipes local changes and goes back to the seed data. */
export async function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY)
  await blobStore.clear()
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))
const copy = <T,>(v: T): T => structuredClone(v)

// ---- Users ----
export async function getCurrentUser(): Promise<User> {
  await delay(40)
  return copy(db.users.find((u) => u.id === CURRENT_USER_ID)!)
}

export async function updateCurrentUser(patch: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User> {
  await delay(400)
  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!
  Object.assign(user, patch)
  persist()
  return copy(user)
}

export async function changePassword(current: string, next: string): Promise<void> {
  await delay(500)
  if (current === next) throw new Error('New password must be different from the current one.')
}

/** Active team members (no clients): the people projects and tasks can be assigned to. */
export async function getUsers(): Promise<User[]> {
  await delay()
  return copy(db.users.filter((u) => u.role !== 'client' && u.isActive !== false))
}

export interface NewMemberInput {
  name: string
  email: string
  password: string
  role: Exclude<Role, 'admin'>
  clientId?: string
}
export type MemberPatch = Partial<Pick<User, 'role' | 'isActive' | 'clientId'>>

/** Everyone with an account, including clients and blocked accounts. Admin only. */
export async function getMembers(): Promise<User[]> {
  await delay()
  return copy(db.users)
}

export async function createMember(input: NewMemberInput): Promise<User> {
  await delay(400)
  const email = input.email.trim().toLowerCase()
  if (db.users.some((u) => u.email.toLowerCase() === email)) throw new Error('An account with that email already exists.')
  const user: User = {
    id: `u${Date.now()}`,
    name: input.name.trim(),
    email,
    role: input.role,
    isActive: true,
    clientId: input.role === 'client' ? input.clientId : undefined,
  }
  db.users.push(user)
  persist()
  return copy(user)
}

export async function updateMember(id: string, patch: MemberPatch): Promise<User> {
  await delay(200)
  const user = db.users.find((u) => u.id === id)
  if (!user) throw new Error('Member not found.')
  if (patch.role === 'admin') throw new Error('There can only be one admin.')
  if (user.role === 'admin' && (patch.role || patch.isActive === false)) {
    throw new Error("The admin account can't be demoted or deactivated.")
  }
  Object.assign(user, patch)
  persist()
  return copy(user)
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  await delay(60)
  return copy(db.preferences)
}

export async function updateNotificationPreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
  await delay(200)
  db.preferences = copy(prefs)
  persist()
  return copy(db.preferences)
}

// ---- Clients ----
export async function getClients(): Promise<Client[]> {
  await delay()
  return copy(db.clients)
}

export async function createClient(name: string): Promise<Client> {
  await delay(150)
  const client: Client = { id: `c${Date.now()}`, name }
  db.clients.push(client)
  persist()
  return copy(client)
}

// ---- Projects ----
export async function getProjects(): Promise<Project[]> {
  await delay()
  return copy(db.projects)
}

export async function getProject(id: string): Promise<Project | undefined> {
  await delay(60)
  const p = db.projects.find((x) => x.id === id)
  return p && copy(p)
}

export type NewProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'number' | 'title' | 'channels' | 'script'> &
  Partial<Pick<Project, 'channels' | 'script'>> & { title?: string }

export async function createProject(input: NewProjectInput): Promise<Project> {
  await delay(200)
  const number = Math.max(0, ...db.projects.map((p) => p.number ?? 0)) + 1
  const now = new Date().toISOString()
  const project: Project = {
    channels: [],
    script: '',
    ...input,
    id: `p${Date.now()}`,
    number: input.title ? undefined : number,
    title: input.title || String(number),
    createdAt: now,
    updatedAt: now,
  }
  db.projects.push(project)
  persist()
  return copy(project)
}

export async function updateProjects(ids: string[], patch: Partial<Project>): Promise<Project[]> {
  await delay(200)
  const updated: Project[] = []
  for (const p of db.projects) {
    if (ids.includes(p.id)) {
      Object.assign(p, patch, { updatedAt: new Date().toISOString() })
      updated.push(copy(p))
    }
  }
  persist()
  return updated
}

function pushNotification(actorId: string, type: NotificationType, projectId: string, payload: NotificationPayload = {}) {
  const n: Notification = {
    id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    actorId,
    type,
    projectId,
    payload,
    createdAt: new Date().toISOString(),
    seen: false,
  }
  db.notifications.unshift(n)
  persist()
  return copy(n)
}

/**
 * Update a single project and record the change as a `field_changed` notification.
 * `change` carries the human-readable before/after values (e.g. Format: talking_head → qa).
 */
export async function updateProject(
  id: string,
  patch: Partial<Project>,
  opts: { actorId: string; change?: Required<NotificationPayload> },
): Promise<{ project: Project; notification?: Notification }> {
  await delay(120)
  const p = db.projects.find((x) => x.id === id)
  if (!p) throw new Error('Project not found')
  Object.assign(p, patch, { updatedAt: new Date().toISOString() })
  const notification = opts.change ? pushNotification(opts.actorId, 'field_changed', id, opts.change) : undefined
  persist()
  return { project: copy(p), notification }
}

export async function duplicateProject(id: string): Promise<Project> {
  const source = db.projects.find((p) => p.id === id)
  if (!source) throw new Error('Project not found')
  const { id: _id, createdAt: _c, updatedAt: _u, number: _n, title, ...rest } = source
  return createProject({ ...rest, title: source.number ? undefined : `${title} (copy)` })
}

export async function deleteProjects(ids: string[]): Promise<void> {
  await delay(200)
  db.projects = db.projects.filter((p) => !ids.includes(p.id))
  persist()
}

// ---- Media (blobs in IndexedDB + object URLs; swap for Supabase Storage later) ----
export async function getMedia(): Promise<MediaItem[]> {
  await Promise.all([delay(60), hydrateBlobs()])
  return copy(db.media)
}

export interface UploadMediaInput {
  projectId: string
  file: File
  kind: MediaItem['kind']
  uploadedBy: string
  width?: number
  height?: number
  durationSec?: number
  thumbnailUrl?: string
}

/** Simulated upload with progress callbacks (0–1). Returns the stored item and its notification. */
export async function uploadMedia(
  input: UploadMediaInput,
  onProgress?: (progress: number) => void,
): Promise<{ item: MediaItem; notification: Notification }> {
  // Fake a transfer speed of ~25MB/s with a floor so tiny files still show progress.
  const steps = 12
  const total = Math.min(2400, Math.max(500, (input.file.size / (25 * 1024 * 1024)) * 1000))
  for (let i = 1; i <= steps; i++) {
    await delay(total / steps)
    onProgress?.(i / steps)
  }
  const item: MediaItem = {
    id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    projectId: input.projectId,
    kind: input.kind,
    name: input.file.name,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    width: input.width,
    height: input.height,
    durationSec: input.durationSec,
    url: URL.createObjectURL(input.file),
    thumbnailUrl: input.thumbnailUrl,
    uploadedBy: input.uploadedBy,
    createdAt: new Date().toISOString(),
  }
  await blobStore.put(item.id, input.file)
  db.media.push(item)
  const project = db.projects.find((p) => p.id === input.projectId)
  if (project) project.updatedAt = item.createdAt
  const notification = pushNotification(input.uploadedBy, 'content_uploaded', input.projectId)
  persist()
  return { item: copy(item), notification }
}

export async function deleteMedia(id: string): Promise<void> {
  await delay(100)
  const item = db.media.find((m) => m.id === id)
  if (item?.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
  db.media = db.media.filter((m) => m.id !== id)
  void blobStore.delete(id)
  persist()
}

// ---- Notifications ----
export async function getNotifications(): Promise<Notification[]> {
  await delay()
  return copy(db.notifications).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function markNotificationsSeen(ids: string[]): Promise<void> {
  await delay(60)
  for (const n of db.notifications) if (ids.includes(n.id)) n.seen = true
  persist()
}

// ---- Tasks, approvals, team, messages ----
export async function getTasks(): Promise<Task[]> {
  await delay()
  return copy(db.tasks)
}

export async function createTask(input: Omit<Task, 'id' | 'done'>): Promise<Task> {
  await delay(150)
  const task: Task = { ...input, id: `t${Date.now()}`, done: false }
  db.tasks.push(task)
  persist()
  return copy(task)
}

export async function toggleTask(id: string): Promise<Task> {
  await delay(60)
  const t = db.tasks.find((x) => x.id === id)!
  t.done = !t.done
  persist()
  return copy(t)
}

export async function getApprovals(): Promise<Approval[]> {
  await delay()
  return copy(db.approvals)
}

export type NewApprovalInput = Pick<
  Approval,
  'projectId' | 'scope' | 'includeContent' | 'mediaIds' | 'requestedBy' | 'approvers' | 'statusAfterApproval' | 'expiresAt' | 'note'
>

export async function createApproval(input: NewApprovalInput): Promise<{ approval: Approval; notification: Notification }> {
  await delay(250)
  const approval: Approval = {
    ...input,
    id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    decisions: [],
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  db.approvals.push(approval)
  const notification = pushNotification(input.requestedBy, 'approval_requested', input.projectId)
  persist()
  return { approval: copy(approval), notification }
}

export async function addApprovalItems(approvalId: string, mediaIds: string[]): Promise<Approval> {
  await delay(120)
  const a = db.approvals.find((x) => x.id === approvalId)
  if (!a) throw new Error('Approval not found')
  a.mediaIds = [...a.mediaIds, ...mediaIds.filter((id) => !a.mediaIds.includes(id))]
  if (a.scope === 'content' && a.mediaIds.length) a.scope = 'all'
  persist()
  return copy(a)
}

/**
 * Records an approver's decision. "Changes requested" closes the round right away;
 * once every approver has approved, the project moves to `statusAfterApproval`.
 */
export async function decideApproval(
  approvalId: string,
  approver: ApproverRef,
  decision: ApprovalDecision['decision'],
  actorId: string,
): Promise<{ approval: Approval; project?: Project; notification?: Notification }> {
  await delay(200)
  const a = db.approvals.find((x) => x.id === approvalId)
  if (!a) throw new Error('Approval not found')
  const turn = currentApprover(a)
  if (!turn || !sameApprover(turn, approver)) throw new Error('It is not this approver’s turn')
  a.decisions.push({ approver, decision, at: new Date().toISOString() })

  const project = db.projects.find((p) => p.id === a.projectId)
  const now = new Date().toISOString()
  let notification: Notification | undefined
  if (decision === 'changes_requested') {
    a.status = 'changes_requested'
    if (project) Object.assign(project, { status: 'Changes Requested', updatedAt: now })
    notification = pushNotification(actorId, 'approval_rejected', a.projectId)
  } else if (!currentApprover(a)) {
    a.status = 'approved'
    if (project && a.statusAfterApproval) Object.assign(project, { status: a.statusAfterApproval, updatedAt: now })
    notification = pushNotification(actorId, 'approval_approved', a.projectId)
  }
  persist()
  return { approval: copy(a), project: project && copy(project), notification }
}

// ---- Approval review comments ----
export async function getApprovalComments(): Promise<ApprovalComment[]> {
  await Promise.all([delay(60), hydrateBlobs()])
  return copy(db.approvalComments)
}

export interface NewCommentInput
  extends Pick<ApprovalComment, 'approvalId' | 'itemId' | 'authorId' | 'body' | 'timestampSec' | 'drawing'> {
  files: File[]
}

export async function addApprovalComment(input: NewCommentInput): Promise<ApprovalComment> {
  await delay(120)
  const { files, ...rest } = input
  const attachments: Attachment[] = await Promise.all(
    files.map(async (file) => {
      const id = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
      await blobStore.put(id, file)
      return { id, name: file.name, mimeType: file.type, sizeBytes: file.size, url: URL.createObjectURL(file) }
    }),
  )
  const comment: ApprovalComment = {
    ...rest,
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    attachments,
  }
  db.approvalComments.push(comment)
  persist()
  return copy(comment)
}

export async function deleteApprovalComment(id: string): Promise<void> {
  await delay(60)
  const c = db.approvalComments.find((x) => x.id === id)
  c?.attachments.forEach((a) => void blobStore.delete(a.id))
  db.approvalComments = db.approvalComments.filter((x) => x.id !== id)
  persist()
}

export async function getTeam(): Promise<TeamMember[]> {
  await delay()
  return copy(db.team)
}

export async function getMessages(): Promise<Message[]> {
  await delay()
  return copy(db.messages)
}

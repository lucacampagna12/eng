/**
 * Supabase implementation of the data layer. Same function signatures as ./mock so the stores
 * and components don't know which backend they talk to. Row Level Security (see
 * supabase/migrations) decides what the signed-in user can read and write.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import * as tus from 'tus-js-client'
import { currentApprover, sameApprover } from '@/lib/approvals'
import { supabase as client } from '@/lib/supabase'
import type {
  Approval,
  ApprovalComment,
  ApprovalDecision,
  ApproverRef,
  Attachment,
  Client,
  DrawingStroke,
  MediaItem,
  Message,
  Notification,
  NotificationPayload,
  NotificationPreferences,
  NotificationType,
  Project,
  Task,
  TeamMember,
  User,
} from '@/types'
import type { NewApprovalInput, NewCommentInput, NewProjectInput, UploadMediaInput } from './mock'

const sb = () => {
  if (!client) throw new Error('Supabase is not configured')
  return client
}

/** Unwraps a Supabase response, turning errors into exceptions. */
function must<T>(res: { data: T; error: PostgrestError | Error | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message)
  return res.data as NonNullable<T>
}

const SIGNED_URL_TTL = 60 * 60 * 6 // 6h; URLs are re-signed on every load

async function myId(): Promise<string> {
  const { data } = await sb().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not signed in')
  return id
}

const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-120)

async function signPaths(bucket: string, paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return new Map()
  const data = must(await sb().storage.from(bucket).createSignedUrls(unique, SIGNED_URL_TTL))
  const urls = new Map<string, string>()
  for (const d of data) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl)
  return urls
}

// ---------------------------------------------------------------------------
// Row mappers (snake_case rows ↔ camelCase app types)
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>

const toUser = (r: Row): User => ({
  id: r.id as string,
  name: (r.name as string) || (r.email as string),
  email: r.email as string,
  avatarUrl: (r.avatar_url as string) ?? undefined,
  role: r.role as User['role'],
})

const toProject = (r: Row): Project => ({
  id: r.id as string,
  number: (r.number as number) ?? undefined,
  title: r.title as string,
  clientId: r.client_id as string,
  status: r.status as Project['status'],
  type: r.type as Project['type'],
  service: r.service as string,
  assigneeId: (r.assignee_id as string) ?? '',
  approverId: (r.approver_id as string) ?? undefined,
  ownerId: (r.owner_id as string) ?? '',
  dueDate: r.due_date as string,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
  archived: r.archived as boolean,
  format: (r.format as string) ?? undefined,
  videoFormat: (r.video_format as string) ?? undefined,
  scheduledAt: (r.scheduled_at as string) ?? undefined,
  channels: (r.channels as string[]) ?? [],
  script: (r.script as string) ?? '',
})

const PROJECT_COLUMNS: Partial<Record<keyof Project, string>> = {
  number: 'number',
  title: 'title',
  clientId: 'client_id',
  status: 'status',
  type: 'type',
  service: 'service',
  assigneeId: 'assignee_id',
  approverId: 'approver_id',
  ownerId: 'owner_id',
  dueDate: 'due_date',
  archived: 'archived',
  format: 'format',
  videoFormat: 'video_format',
  scheduledAt: 'scheduled_at',
  channels: 'channels',
  script: 'script',
}

/** Patch → row. Keys present with `undefined`/'' become NULL (e.g. removing an optional field). */
function projectRow(patch: Partial<Project>): Row {
  const row: Row = {}
  for (const [key, column] of Object.entries(PROJECT_COLUMNS)) {
    if (!(key in patch)) continue
    const v = patch[key as keyof Project]
    const empty = v === undefined || v === ''
    row[column!] = empty ? (key === 'service' || key === 'script' ? '' : null) : v
  }
  return row
}

const toTask = (r: Row): Task => ({
  id: r.id as string,
  title: r.title as string,
  projectId: r.project_id as string,
  assigneeId: (r.assignee_id as string) ?? '',
  done: r.done as boolean,
})

const toApproval = (r: Row): Approval => ({
  id: r.id as string,
  projectId: r.project_id as string,
  scope: r.scope as Approval['scope'],
  includeContent: r.include_content as boolean,
  mediaIds: (r.media_ids as string[]) ?? [],
  requestedBy: (r.requested_by as string) ?? '',
  approvers: (r.approvers as ApproverRef[]) ?? [],
  decisions: (r.decisions as ApprovalDecision[]) ?? [],
  status: r.status as Approval['status'],
  statusAfterApproval: (r.status_after_approval as Approval['statusAfterApproval']) ?? undefined,
  expiresAt: (r.expires_at as string) ?? undefined,
  note: (r.note as string) ?? undefined,
  createdAt: r.created_at as string,
})

const toNotification = (r: Row, seen: boolean): Notification => ({
  id: r.id as string,
  actorId: (r.actor_id as string) ?? '',
  type: r.type as NotificationType,
  projectId: (r.project_id as string) ?? '',
  payload: (r.payload as NotificationPayload) ?? {},
  createdAt: r.created_at as string,
  seen,
})

interface StoredAttachment {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  path: string
}

function toComment(r: Row, urls: Map<string, string>): ApprovalComment {
  return {
    id: r.id as string,
    approvalId: r.approval_id as string,
    itemId: (r.item_id as string) ?? undefined,
    authorId: (r.author_id as string) ?? '',
    body: (r.body as string) ?? '',
    createdAt: r.created_at as string,
    timestampSec: r.timestamp_sec == null ? undefined : Number(r.timestamp_sec),
    drawing: (r.drawing as DrawingStroke[]) ?? undefined,
    attachments: ((r.attachments as StoredAttachment[]) ?? []).map(
      (a): Attachment => ({ id: a.id, name: a.name, mimeType: a.mimeType, sizeBytes: a.sizeBytes, url: urls.get(a.path) ?? '' }),
    ),
  }
}

async function pushNotification(type: NotificationType, projectId: string, payload: NotificationPayload = {}) {
  const actorId = await myId()
  const row = must(
    await sb().from('notifications').insert({ actor_id: actorId, type, project_id: projectId, payload }).select().single(),
  )
  return toNotification(row, false)
}

// ---------------------------------------------------------------------------
// Users & profile
// ---------------------------------------------------------------------------

export async function resetDemoData() {
  /* Real data: nothing to reset. */
}

export async function getCurrentUser(): Promise<User> {
  const id = await myId()
  return toUser(must(await sb().from('profiles').select('*').eq('id', id).single()))
}

export async function updateCurrentUser(patch: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User> {
  const id = await myId()
  const row: Row = {}
  if ('name' in patch) row.name = patch.name
  if ('avatarUrl' in patch) row.avatar_url = patch.avatarUrl ?? null
  return toUser(must(await sb().from('profiles').update(row).eq('id', id).select().single()))
}

export async function changePassword(current: string, next: string): Promise<void> {
  if (current === next) throw new Error('New password must be different from the current one.')
  const { data } = await sb().auth.getSession()
  const email = data.session?.user.email
  if (!email) throw new Error('Not signed in')
  const check = await sb().auth.signInWithPassword({ email, password: current })
  if (check.error) throw new Error('Current password is incorrect.')
  const res = await sb().auth.updateUser({ password: next })
  if (res.error) throw new Error(res.error.message)
}

export async function getUsers(): Promise<User[]> {
  return must(await sb().from('profiles').select('*').eq('is_active', true).order('name')).map(toUser)
}

export async function getTeam(): Promise<TeamMember[]> {
  const me = await myId()
  const users = await getUsers()
  return users.filter((u) => u.id !== me).map((u) => ({ userId: u.id }))
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const id = await myId()
  const row = must(await sb().from('profiles').select('notification_prefs').eq('id', id).single())
  return row.notification_prefs as NotificationPreferences
}

export async function updateNotificationPreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
  const id = await myId()
  must(await sb().from('profiles').update({ notification_prefs: prefs }).eq('id', id))
  return prefs
}

export async function getMessages(): Promise<Message[]> {
  return []
}

// ---------------------------------------------------------------------------
// Clients & projects
// ---------------------------------------------------------------------------

export async function getClients(): Promise<Client[]> {
  return must(await sb().from('clients').select('*').order('name')).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    avatarUrl: (r.avatar_url as string) ?? undefined,
  }))
}

export async function createClient(name: string): Promise<Client> {
  const r = must(await sb().from('clients').insert({ name }).select().single())
  return { id: r.id as string, name: r.name as string }
}

export async function getProjects(): Promise<Project[]> {
  return must(await sb().from('projects').select('*').order('created_at', { ascending: false })).map(toProject)
}

export async function getProject(id: string): Promise<Project | undefined> {
  const row = must(await sb().from('projects').select('*').eq('id', id).maybeSingle())
  return row ? toProject(row) : undefined
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  let number: number | undefined
  if (!input.title) {
    const last = must(
      await sb().from('projects').select('number').not('number', 'is', null).order('number', { ascending: false }).limit(1),
    )
    number = ((last[0]?.number as number) ?? 0) + 1
  }
  const row = projectRow({ channels: [], script: '', ...input, number, title: input.title || String(number) })
  const created = toProject(must(await sb().from('projects').insert(row).select().single()))
  void pushNotification('project_created', created.id).catch(() => undefined)
  return created
}

export async function updateProjects(ids: string[], patch: Partial<Project>): Promise<Project[]> {
  return must(await sb().from('projects').update(projectRow(patch)).in('id', ids).select()).map(toProject)
}

export async function updateProject(
  id: string,
  patch: Partial<Project>,
  opts: { actorId: string; change?: Required<NotificationPayload> },
): Promise<{ project: Project; notification?: Notification }> {
  const project = toProject(must(await sb().from('projects').update(projectRow(patch)).eq('id', id).select().single()))
  const notification = opts.change ? await pushNotification('field_changed', id, opts.change) : undefined
  return { project, notification }
}

export async function duplicateProject(id: string): Promise<Project> {
  const source = await getProject(id)
  if (!source) throw new Error('Project not found')
  const { id: _id, createdAt: _c, updatedAt: _u, number: _n, title, ...rest } = source
  return createProject({ ...rest, title: source.number ? undefined : `${title} (copy)` })
}

export async function deleteProjects(ids: string[]): Promise<void> {
  // Remove stored files first; rows cascade when the project goes.
  const files = must(await sb().from('media').select('storage_path, thumbnail_path').in('project_id', ids))
  const paths = files.flatMap((f) => [f.storage_path as string, f.thumbnail_path as string]).filter(Boolean)
  if (paths.length) await sb().storage.from('media').remove(paths)
  must(await sb().from('projects').delete().in('id', ids))
}

// ---------------------------------------------------------------------------
// Media (private "media" bucket, resumable uploads with progress)
// ---------------------------------------------------------------------------

async function toMediaItems(rows: Row[]): Promise<MediaItem[]> {
  const urls = await signPaths(
    'media',
    rows.flatMap((r) => [r.storage_path as string, r.thumbnail_path as string]),
  )
  return rows.map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    kind: r.kind as MediaItem['kind'],
    name: r.name as string,
    mimeType: r.mime_type as string,
    sizeBytes: Number(r.size_bytes),
    width: (r.width as number) ?? undefined,
    height: (r.height as number) ?? undefined,
    durationSec: r.duration_sec == null ? undefined : Number(r.duration_sec),
    url: urls.get(r.storage_path as string) ?? '',
    thumbnailUrl: r.thumbnail_path ? urls.get(r.thumbnail_path as string) : undefined,
    uploadedBy: (r.uploaded_by as string) ?? '',
    createdAt: r.created_at as string,
  }))
}

export async function getMedia(): Promise<MediaItem[]> {
  return toMediaItems(must(await sb().from('media').select('*').order('created_at')))
}

/** Resumable (tus) upload so large videos report real progress and survive flaky connections. */
async function resumableUpload(bucket: string, path: string, file: File, onProgress?: (p: number) => void) {
  const { data } = await sb().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  const projectRef = new URL(import.meta.env.VITE_SUPABASE_URL as string).hostname.split('.')[0]
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${token}` },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // required by Supabase: exactly 6MB
      onError: (err) => {
        const status = (err as tus.DetailedError).originalResponse?.getStatus()
        reject(new Error(status === 413 ? 'File is larger than your Supabase plan allows' : err.message))
      },
      onProgress: (sent, total) => onProgress?.(total ? sent / total : 0),
      onSuccess: () => resolve(),
    })
    upload.start()
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',')
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function uploadMedia(
  input: UploadMediaInput,
  onProgress?: (progress: number) => void,
): Promise<{ item: MediaItem; notification: Notification }> {
  const id = crypto.randomUUID()
  const storagePath = `${input.projectId}/${id}-${safeName(input.file.name)}`
  await resumableUpload('media', storagePath, input.file, onProgress)

  let thumbnailPath: string | undefined
  if (input.thumbnailUrl?.startsWith('data:')) {
    thumbnailPath = `${input.projectId}/thumbs/${id}.jpg`
    const res = await sb()
      .storage.from('media')
      .upload(thumbnailPath, dataUrlToBlob(input.thumbnailUrl), { contentType: 'image/jpeg' })
    if (res.error) thumbnailPath = undefined
  }

  const row = must(
    await sb()
      .from('media')
      .insert({
        id,
        project_id: input.projectId,
        kind: input.kind,
        name: input.file.name,
        mime_type: input.file.type,
        size_bytes: input.file.size,
        width: input.width ?? null,
        height: input.height ?? null,
        duration_sec: input.durationSec ?? null,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath ?? null,
        uploaded_by: input.uploadedBy || null,
      })
      .select()
      .single(),
  )
  await sb().from('projects').update({ updated_at: new Date().toISOString() }).eq('id', input.projectId)
  const [item] = await toMediaItems([row])
  const notification = await pushNotification('content_uploaded', input.projectId)
  return { item, notification }
}

export async function deleteMedia(id: string): Promise<void> {
  const row = must(await sb().from('media').select('storage_path, thumbnail_path').eq('id', id).maybeSingle())
  must(await sb().from('media').delete().eq('id', id))
  const paths = row ? [row.storage_path as string, row.thumbnail_path as string].filter(Boolean) : []
  if (paths.length) await sb().storage.from('media').remove(paths)
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(): Promise<Notification[]> {
  const [rows, reads] = await Promise.all([
    sb().from('notifications').select('*').order('created_at', { ascending: false }).limit(300).then(must),
    sb().from('notification_reads').select('notification_id').then(must),
  ])
  const seen = new Set(reads.map((r) => r.notification_id as string))
  return rows.map((r) => toNotification(r, seen.has(r.id as string)))
}

export async function markNotificationsSeen(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const userId = await myId()
  must(
    await sb()
      .from('notification_reads')
      .upsert(
        ids.map((id) => ({ notification_id: id, user_id: userId })),
        { onConflict: 'notification_id,user_id', ignoreDuplicates: true },
      ),
  )
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function getTasks(): Promise<Task[]> {
  return must(await sb().from('tasks').select('*').order('created_at')).map(toTask)
}

export async function createTask(input: Omit<Task, 'id' | 'done'>): Promise<Task> {
  return toTask(
    must(
      await sb()
        .from('tasks')
        .insert({ title: input.title, project_id: input.projectId, assignee_id: input.assigneeId || null })
        .select()
        .single(),
    ),
  )
}

export async function toggleTask(id: string): Promise<Task> {
  const current = must(await sb().from('tasks').select('done').eq('id', id).single())
  return toTask(must(await sb().from('tasks').update({ done: !current.done }).eq('id', id).select().single()))
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export async function getApprovals(): Promise<Approval[]> {
  return must(await sb().from('approvals').select('*').order('created_at')).map(toApproval)
}

export async function createApproval(input: NewApprovalInput): Promise<{ approval: Approval; notification: Notification }> {
  const row = must(
    await sb()
      .from('approvals')
      .insert({
        project_id: input.projectId,
        scope: input.scope,
        include_content: input.includeContent,
        media_ids: input.mediaIds,
        requested_by: input.requestedBy,
        approvers: input.approvers,
        status_after_approval: input.statusAfterApproval ?? null,
        expires_at: input.expiresAt ?? null,
        note: input.note ?? null,
      })
      .select()
      .single(),
  )
  const notification = await pushNotification('approval_requested', input.projectId)
  return { approval: toApproval(row), notification }
}

export async function addApprovalItems(approvalId: string, mediaIds: string[]): Promise<Approval> {
  const current = toApproval(must(await sb().from('approvals').select('*').eq('id', approvalId).single()))
  const nextIds = [...current.mediaIds, ...mediaIds.filter((id) => !current.mediaIds.includes(id))]
  const scope = current.scope === 'content' && nextIds.length ? 'all' : current.scope
  return toApproval(
    must(await sb().from('approvals').update({ media_ids: nextIds, scope }).eq('id', approvalId).select().single()),
  )
}

export async function decideApproval(
  approvalId: string,
  approver: ApproverRef,
  decision: ApprovalDecision['decision'],
  _actorId: string,
): Promise<{ approval: Approval; project?: Project; notification?: Notification }> {
  const a = toApproval(must(await sb().from('approvals').select('*').eq('id', approvalId).single()))
  const turn = currentApprover(a)
  if (!turn || !sameApprover(turn, approver)) throw new Error('It is not this approver’s turn')
  a.decisions = [...a.decisions, { approver, decision, at: new Date().toISOString() }]

  let projectStatus: Project['status'] | undefined
  let notification: Notification | undefined
  if (decision === 'changes_requested') {
    a.status = 'changes_requested'
    projectStatus = 'Changes Requested'
    notification = await pushNotification('approval_rejected', a.projectId)
  } else if (!currentApprover(a)) {
    a.status = 'approved'
    projectStatus = a.statusAfterApproval
    notification = await pushNotification('approval_approved', a.projectId)
  }
  const approval = toApproval(
    must(
      await sb().from('approvals').update({ decisions: a.decisions, status: a.status }).eq('id', approvalId).select().single(),
    ),
  )
  const project = projectStatus
    ? toProject(must(await sb().from('projects').update({ status: projectStatus }).eq('id', a.projectId).select().single()))
    : undefined
  return { approval, project, notification }
}

// ---------------------------------------------------------------------------
// Approval comments (attachments in the private "attachments" bucket)
// ---------------------------------------------------------------------------

export async function getApprovalComments(): Promise<ApprovalComment[]> {
  const rows = must(await sb().from('approval_comments').select('*').order('created_at'))
  const urls = await signPaths(
    'attachments',
    rows.flatMap((r) => ((r.attachments as StoredAttachment[]) ?? []).map((a) => a.path)),
  )
  return rows.map((r) => toComment(r, urls))
}

export async function addApprovalComment(input: NewCommentInput): Promise<ApprovalComment> {
  const authorId = await myId()
  const stored: StoredAttachment[] = await Promise.all(
    input.files.map(async (file) => {
      const id = crypto.randomUUID()
      const path = `${input.approvalId}/${id}-${safeName(file.name)}`
      must(await sb().storage.from('attachments').upload(path, file, { contentType: file.type || undefined }))
      return { id, name: file.name, mimeType: file.type, sizeBytes: file.size, path }
    }),
  )
  const row = must(
    await sb()
      .from('approval_comments')
      .insert({
        approval_id: input.approvalId,
        item_id: input.itemId ?? null,
        author_id: authorId,
        body: input.body,
        timestamp_sec: input.timestampSec ?? null,
        drawing: input.drawing ?? null,
        attachments: stored,
      })
      .select()
      .single(),
  )
  return toComment(row, await signPaths('attachments', stored.map((a) => a.path)))
}

export async function deleteApprovalComment(id: string): Promise<void> {
  const row = must(await sb().from('approval_comments').select('attachments').eq('id', id).maybeSingle())
  must(await sb().from('approval_comments').delete().eq('id', id))
  const paths = ((row?.attachments as StoredAttachment[]) ?? []).map((a) => a.path)
  if (paths.length) await sb().storage.from('attachments').remove(paths)
}

/**
 * Data access layer entry point. Uses Supabase when VITE_SUPABASE_* env vars are set
 * (src/lib/supabase.ts), otherwise the local mock (./mock) with demo data.
 * Both implementations share the exact same API; TypeScript enforces it below.
 */
import { isSupabaseConfigured } from '@/lib/supabase'
import * as mock from './mock'
import * as remote from './remote'

export type { NewApprovalInput, NewCommentInput, NewProjectInput, UploadMediaInput } from './mock'

const impl: typeof mock = isSupabaseConfigured ? remote : mock

export const resetDemoData = impl.resetDemoData
export const getCurrentUser = impl.getCurrentUser
export const updateCurrentUser = impl.updateCurrentUser
export const changePassword = impl.changePassword
export const getUsers = impl.getUsers
export const getNotificationPreferences = impl.getNotificationPreferences
export const updateNotificationPreferences = impl.updateNotificationPreferences
export const getClients = impl.getClients
export const createClient = impl.createClient
export const getProjects = impl.getProjects
export const getProject = impl.getProject
export const createProject = impl.createProject
export const updateProjects = impl.updateProjects
export const updateProject = impl.updateProject
export const duplicateProject = impl.duplicateProject
export const deleteProjects = impl.deleteProjects
export const getMedia = impl.getMedia
export const uploadMedia = impl.uploadMedia
export const deleteMedia = impl.deleteMedia
export const getNotifications = impl.getNotifications
export const markNotificationsSeen = impl.markNotificationsSeen
export const getTasks = impl.getTasks
export const createTask = impl.createTask
export const toggleTask = impl.toggleTask
export const getApprovals = impl.getApprovals
export const createApproval = impl.createApproval
export const addApprovalItems = impl.addApprovalItems
export const decideApproval = impl.decideApproval
export const getApprovalComments = impl.getApprovalComments
export const addApprovalComment = impl.addApprovalComment
export const deleteApprovalComment = impl.deleteApprovalComment
export const getTeam = impl.getTeam
export const getMessages = impl.getMessages

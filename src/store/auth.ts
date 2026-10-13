import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/**
 * - disabled: no Supabase configured → the app runs on local mock data, no login.
 * - loading:  checking the stored session.
 * - signedOut / inactive / ready: real auth states.
 * - recovery: the user opened a password-reset link and must choose a new password.
 */
export type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'inactive' | 'ready' | 'recovery'

interface AuthState {
  status: AuthStatus
  session: Session | null
  init: () => void
  signIn: (email: string, password: string) => Promise<string | undefined>
  sendReset: (email: string) => Promise<string | undefined>
  setNewPassword: (password: string) => Promise<string | undefined>
  signOut: () => Promise<void>
}

let initialized = false

/** A session only grants access once an admin has activated the member's profile. */
async function statusFor(session: Session | null): Promise<AuthStatus> {
  if (!session || !supabase) return 'signedOut'
  const { data } = await supabase.from('profiles').select('is_active').eq('id', session.user.id).maybeSingle()
  return data?.is_active ? 'ready' : 'inactive'
}

export const useAuth = create<AuthState>((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'disabled',
  session: null,

  init: () => {
    if (initialized || !supabase) return
    initialized = true
    void supabase.auth.getSession().then(async ({ data }) => {
      set({ session: data.session, status: await statusFor(data.session) })
    })
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') return set({ session, status: 'recovery' })
      if (event === 'SIGNED_OUT') return set({ session: null, status: 'signedOut' })
      if (event === 'SIGNED_IN' && get().status !== 'recovery') {
        // Defer: Supabase recommends not awaiting other calls inside this callback.
        setTimeout(async () => set({ session, status: await statusFor(session) }), 0)
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        set({ session })
      }
    })
  },

  signIn: async (email, password) => {
    if (!supabase) return 'Supabase is not configured'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message
  },

  sendReset: async (email) => {
    if (!supabase) return 'Supabase is not configured'
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    return error?.message
  },

  setNewPassword: async (password) => {
    if (!supabase) return 'Supabase is not configured'
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return error.message
    set({ status: await statusFor(get().session) })
  },

  signOut: async () => {
    await supabase?.auth.signOut()
    // Drop every cached store (projects, media URLs…) from the previous user.
    window.location.assign('/')
  },
}))

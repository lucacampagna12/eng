import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** True when the app is configured to talk to Supabase; otherwise it runs on local mock data. */
export const isSupabaseConfigured = Boolean(url && publishableKey)

/** Browser client. Uses the publishable key only; RLS policies decide what each user can access. */
export const supabase = isSupabaseConfigured ? createClient(url!, publishableKey!) : null

import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/members — the admin creates a team or client account.
 *
 * Runs on Vercel with the Supabase secret key (never shipped to the browser). The caller must send
 * their session token and be the active admin. The role travels in app_metadata, which only the
 * secret key can set; the database trigger turns it into an active profile.
 */

const ROLES = ['manager', 'editor', 'client'] as const
type InviteRole = (typeof ROLES)[number]

const json = (status: number, body: unknown) => Response.json(body, { status })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) return json(500, { error: 'The server is missing its Supabase credentials.' })
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  // 1. Only the active admin may create accounts.
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'Sign in first.' })
  const { data: auth } = await admin.auth.getUser(token)
  if (!auth.user) return json(401, { error: 'Your session expired. Sign in again.' })
  const { data: caller } = await admin.from('profiles').select('role, is_active').eq('id', auth.user.id).maybeSingle()
  if (caller?.role !== 'admin' || !caller.is_active) return json(403, { error: 'Only the admin can create accounts.' })

  // 2. Validate the new account.
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json(400, { error: 'Invalid request.' })
  }
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const role = body.role as InviteRole
  const clientId = body.clientId ? String(body.clientId) : null

  if (!name) return json(400, { error: 'Enter a name.' })
  if (!EMAIL.test(email)) return json(400, { error: 'Enter a valid email.' })
  if (password.length < 8) return json(400, { error: 'The password needs at least 8 characters.' })
  if (!ROLES.includes(role)) return json(400, { error: 'Choose a role.' })
  if (role === 'client') {
    if (!clientId || !UUID.test(clientId)) return json(400, { error: 'Choose which client this account belongs to.' })
    const { data: found } = await admin.from('clients').select('id').eq('id', clientId).maybeSingle()
    if (!found) return json(400, { error: 'That client no longer exists.' })
  }

  // 3. Create the auth user; the on_auth_user_created trigger creates the active profile.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role, client_id: role === 'client' ? clientId : null },
  })
  if (error || !data.user) {
    const taken = error?.message.toLowerCase().includes('already')
    return json(taken ? 409 : 400, { error: taken ? 'An account with that email already exists.' : error?.message ?? 'Could not create the account.' })
  }

  const { data: profile } = await admin.from('profiles').select('*').eq('id', data.user.id).single()
  return json(201, { profile })
}

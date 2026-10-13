import { Check, Copy, Loader2, Plus, RefreshCw } from 'lucide-react'
import * as React from 'react'
import { Avatar } from '@/components/common'
import { toast } from '@/components/common/Toaster'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Switch } from '@/components/ui/misc'
import { SelectMenu } from '@/components/ui/select-menu'
import { ROLE_LABELS } from '@/lib/permissions'
import * as api from '@/services'
import { useData } from '@/store/data'
import type { Role, User } from '@/types'

type InviteRole = Exclude<Role, 'admin'>
const INVITE_ROLES: InviteRole[] = ['manager', 'editor', 'client']
const ROLE_HINTS: Record<InviteRole, string> = {
  manager: 'Works on every project and can create new ones.',
  editor: 'Works on every project, but can’t create them.',
  client: 'Belongs to one client. Can’t see the agency workspace yet.',
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')

/** Keeps assignee pickers etc. in sync after the team changes. */
async function refreshTeam() {
  useData.setState({ users: await api.getUsers() })
}

/** Admin only: create accounts and manage everyone's role and access. */
export function TeamSection() {
  const clients = useData((s) => s.clients)
  const [members, setMembers] = React.useState<User[]>()
  const [addOpen, setAddOpen] = React.useState(false)

  React.useEffect(() => {
    api.getMembers().then(setMembers, (e) => toast(errorMessage(e)))
  }, [])

  const update = async (member: User, patch: api.MemberPatch) => {
    try {
      const saved = await api.updateMember(member.id, patch)
      setMembers((list) => list?.map((m) => (m.id === saved.id ? saved : m)))
      await refreshTeam()
    } catch (e) {
      toast(errorMessage(e))
    }
  }

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xs font-semibold">Team</h2>
          <p className="mt-1 text-2xs text-muted-foreground">Create accounts and choose what each person can do.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus /> Add member
        </Button>
      </div>

      <ul className="mt-5 flex flex-col divide-y divide-border/60 rounded-lg border border-border/60">
        {!members ? (
          <li className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </li>
        ) : (
          members.map((m) => {
            const isAdmin = m.role === 'admin'
            const active = m.isActive !== false
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                <Avatar name={m.name} src={m.avatarUrl} size={28} />
                <div className={`min-w-0 flex-1 basis-40 ${active ? '' : 'opacity-50'}`}>
                  <p className="truncate text-xs font-medium">{m.name}</p>
                  <p className="truncate text-2xs text-muted-foreground">{m.email}</p>
                </div>
                {isAdmin ? (
                  <span className="rounded-md bg-active px-2 py-1 text-2xs font-medium text-accent">Admin</span>
                ) : (
                  <div className="flex items-center gap-2">
                    {m.role === 'client' && (
                      <SelectMenu
                        value={m.clientId}
                        onChange={(clientId) => update(m, { clientId })}
                        options={clientOptions}
                        placeholder="Which client?"
                        className="h-7 w-36 text-xs"
                      />
                    )}
                    <SelectMenu
                      value={m.role}
                      onChange={(role) => update(m, { role: role as InviteRole })}
                      options={INVITE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                      className="h-7 w-28 text-xs"
                    />
                    <Switch
                      checked={active}
                      onCheckedChange={(isActive) => update(m, { isActive })}
                      aria-label={active ? `Deactivate ${m.name}` : `Activate ${m.name}`}
                    />
                  </div>
                )}
              </li>
            )
          })
        )}
      </ul>
      <p className="mt-2 text-2xs text-subtle-foreground">Turn the switch off to block someone’s access without deleting their work.</p>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          {/* Mounted only while open, so the form starts empty every time. */}
          <AddMemberForm
            clientOptions={clientOptions}
            onCreated={(m) => setMembers((list) => [...(list ?? []), m])}
            onClose={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function generatePassword(length = 12) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

function AddMemberForm({
  clientOptions,
  onCreated,
  onClose,
}: {
  clientOptions: { value: string; label: string }[]
  onCreated: (member: User) => void
  onClose: () => void
}) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<InviteRole>('editor')
  const [clientId, setClientId] = React.useState<string>()
  const [password, setPassword] = React.useState(generatePassword)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const [created, setCreated] = React.useState<User>()
  const [copied, setCopied] = React.useState(false)

  const valid = name.trim() && email.trim() && password.length >= 8 && (role !== 'client' || clientId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    setError(undefined)
    try {
      const member = await api.createMember({ name, email, password, role, clientId: role === 'client' ? clientId : undefined })
      onCreated(member)
      await refreshTeam()
      setCreated(member)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    const details = `${window.location.origin}\nEmail: ${created.email}\nPassword: ${password}`
    return (
      <>
        <DialogTitle>{created.name} can sign in now</DialogTitle>
        <DialogDescription>Send them these details. They can change the password later from My Account.</DialogDescription>
        <pre className="mt-4 rounded-lg border border-border bg-surface-sunken p-3 text-xs whitespace-pre-wrap">{details}</pre>
        <DialogFooter>
          <Button
            size="md"
            onClick={async () => {
              await navigator.clipboard.writeText(details)
              setCopied(true)
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy details'}
          </Button>
          <Button size="md" variant="primary" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={submit}>
      <DialogTitle>Add member</DialogTitle>
      <DialogDescription>They’ll be able to sign in right away with the password below.</DialogDescription>
      <div className="mt-4 flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-name">Name</Label>
          <Input id="member-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-email">Email</Label>
          <Input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-role">Role</Label>
          <SelectMenu
            id="member-role"
            value={role}
            onChange={(r) => setRole(r as InviteRole)}
            options={INVITE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
          <p className="text-2xs text-muted-foreground">{ROLE_HINTS[role]}</p>
        </div>
        {role === 'client' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-client">Client</Label>
            <SelectMenu
              id="member-client"
              value={clientId}
              onChange={setClientId}
              options={clientOptions}
              placeholder={clientOptions.length ? 'Select client' : 'Create a client first'}
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-password">Temporary password</Label>
          <div className="flex gap-1.5">
            <Input id="member-password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
            <Button type="button" size="icon" onClick={() => setPassword(generatePassword())} aria-label="Generate another password">
              <RefreshCw />
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="md" variant="primary" disabled={!valid || busy}>
          {busy && <Loader2 className="animate-spin" />} Create account
        </Button>
      </DialogFooter>
    </form>
  )
}

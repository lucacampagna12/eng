import { Bell, Eye, EyeOff, Lock, LogOut, Moon, Sun, Trash2, Upload, User } from 'lucide-react'
import * as React from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common'
import { toast } from '@/components/common/Toaster'
import { Button } from '@/components/ui/button'
import { Input, Label, Switch } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import * as api from '@/services'
import { useAuth } from '@/store/auth'
import { useTheme, useUser } from '@/store/user'
import type { NotificationPreferences } from '@/types'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'password', label: 'Password', icon: Lock },
] as const

export function AccountPage() {
  const { section } = useParams()
  const user = useUser((s) => s.user)
  // Remount the profile form when the saved user changes so its fields reset to the stored values.
  const profileKey = `${user?.id}:${user?.name}:${user?.avatarUrl?.length ?? 0}`
  if (!SECTIONS.some((s) => s.id === section)) return <Navigate to="/account/profile" replace />

  return (
    <>
      <PageHeader title="My Account">
        <MobileThemeToggle />
        <SignOutButton />
      </PageHeader>
      <div className="flex gap-6 px-4 pt-4 pb-10 max-lg:flex-col max-lg:gap-4 md:px-[44px] md:pt-[45px]">
        <nav className="no-scrollbar flex w-[194px] shrink-0 flex-col gap-1 max-lg:w-full max-lg:flex-row max-lg:overflow-x-auto" aria-label="Account sections">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/account/${id}`}
              className={({ isActive }) =>
                cn(
                  'flex h-[35px] shrink-0 items-center gap-2.5 rounded-lg px-3 text-2xs transition-colors duration-150',
                  isActive ? 'bg-active font-medium text-foreground' : 'text-foreground/80 hover:bg-hover hover:text-foreground',
                )
              }
            >
              <Icon className="size-[14px]" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 justify-center pt-[6px]">
          <section className="w-full max-w-[916px] rounded-xl border border-border/60 bg-surface px-4 pt-5 pb-4 md:px-[18px] md:pt-[26px] md:pb-[18px]">
            {section === 'profile' && <ProfileSection key={profileKey} />}
            {section === 'notifications' && <NotificationsSection />}
            {section === 'password' && <PasswordSection />}
          </section>
        </div>
      </div>
    </>
  )
}

async function downscaleAvatar(dataUrl: string, size = 256): Promise<string> {
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas
    .getContext('2d')!
    .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

function SignOutButton() {
  const status = useAuth((s) => s.status)
  const signOut = useAuth((s) => s.signOut)
  if (status === 'disabled') return null
  return (
    <button
      onClick={signOut}
      className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground md:ml-auto"
    >
      <LogOut className="size-4" /> Sign out
    </button>
  )
}

/** The theme toggle lives in the desktop rail; phones get it here. */
function MobileThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="ml-auto flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground md:hidden"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xs font-semibold">{children}</h2>
}

// ---------- Profile ----------

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg']

function ProfileSection() {
  const user = useUser((s) => s.user)
  const updateProfile = useUser((s) => s.updateProfile)
  const [name, setName] = React.useState(user?.name ?? '')
  const [avatar, setAvatar] = React.useState<string | undefined>(user?.avatarUrl)
  const [error, setError] = React.useState<string>()
  const [dragging, setDragging] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const dirty = !!user && (name.trim() !== user.name || avatar !== user.avatarUrl)
  const valid = name.trim().length > 0

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) return setError('Only PNG or JPG images are allowed.')
    if (file.size > MAX_SIZE) return setError('The image must be 5MB or smaller.')
    setError(undefined)
    const reader = new FileReader()
    // Downscale to a small square JPEG so the profile row stays light.
    reader.onload = async () => setAvatar(await downscaleAvatar(reader.result as string))
    reader.readAsDataURL(file)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dirty || !valid) return
    setSaving(true)
    await updateProfile({ name: name.trim(), avatarUrl: avatar })
    setSaving(false)
    toast('Profile updated')
  }

  return (
    <form onSubmit={save}>
      <SectionTitle>Profile Image</SectionTitle>
      <div className="mt-[13px] flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
          aria-label="Upload profile image"
          className={cn(
            'group relative flex size-[65px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-border-strong text-muted-foreground transition-colors duration-150 hover:border-subtle-foreground hover:bg-hover hover:text-foreground',
            dragging && 'border-foreground bg-hover text-foreground',
            avatar && 'border-solid',
          )}
        >
          {avatar ? (
            <>
              <img src={avatar} alt="Profile preview" className="size-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <Upload className="size-4" />
              </span>
            </>
          ) : (
            <Upload className="size-4" strokeWidth={1.75} />
          )}
        </button>
        <div
          className="flex flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleFile(e.dataTransfer.files[0])
          }}
        >
          <button type="button" onClick={() => inputRef.current?.click()} className="text-left text-[10px] leading-[14px] text-foreground hover:underline">
            Click to upload or drag and drop
          </button>
          <span className="text-[9px] leading-[13px] text-muted-foreground">PNG, JPG up to 5MB</span>
          {error && <span className="mt-1 text-2xs text-danger">{error}</span>}
          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar(undefined)}
              className="mt-1 flex items-center gap-1 text-left text-2xs text-subtle-foreground transition-colors hover:text-danger"
            >
              <Trash2 className="size-3" /> Remove image
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <div className="mt-[24px]">
        <SectionTitle>Details</SectionTitle>
        <div className="mt-[13px] grid grid-cols-1 gap-x-[14px] gap-y-4 md:grid-cols-2">
          <div className="flex flex-col gap-[9px]">
            <Label htmlFor="name" className="text-[10px]">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-[33px] rounded-[10px] bg-[color-mix(in_srgb,var(--foreground)_3%,var(--surface))] text-2xs"
              aria-invalid={!valid}
            />
            {!valid && <span className="-mt-1 text-2xs text-danger">Name can't be empty.</span>}
          </div>
          <div className="flex flex-col gap-[9px]">
            <Label htmlFor="email" className="text-[10px]">Email Address</Label>
            <div className="relative">
              <Input id="email" value={user?.email ?? ''} disabled className="h-[33px] rounded-[10px] bg-transparent pr-9 text-2xs" />
              <Lock className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-subtle-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[26px] flex justify-end">
        <Button type="submit" variant="primary" disabled={!dirty || !valid || saving} className="h-7 rounded-[10px] px-4 text-[10px] disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

// ---------- Notifications ----------

const PREFS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'project_created', label: 'Project created', description: 'When someone creates a new project.' },
  { key: 'content_uploaded', label: 'Content uploaded', description: 'When new content is uploaded to a project.' },
  { key: 'field_changed', label: 'Changes', description: 'When a field on a project changes (status, format, dates…).' },
  { key: 'approval_requested', label: 'Approval requests', description: 'When someone asks you to review content.' },
  { key: 'approval_approved', label: 'Approvals', description: 'When an approval item is approved.' },
  { key: 'approval_rejected', label: 'Changes requested', description: 'When a reviewer requests changes.' },
]

function NotificationsSection() {
  const [prefs, setPrefs] = React.useState<NotificationPreferences>()

  React.useEffect(() => {
    void api.getNotificationPreferences().then(setPrefs)
  }, [])

  const toggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    await api.updateNotificationPreferences(next)
  }

  return (
    <div>
      <SectionTitle>Notifications</SectionTitle>
      <p className="mt-1 text-xs text-muted-foreground">Choose which events show up in your inbox.</p>
      <ul className="mt-4 divide-y divide-border">
        {PREFS.map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-6 py-3">
            <label htmlFor={`pref-${p.key}`} className="cursor-pointer">
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </label>
            <Switch
              id={`pref-${p.key}`}
              checked={prefs?.[p.key] ?? false}
              disabled={!prefs}
              onCheckedChange={(v) => toggle(p.key, v)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Password ----------

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="h-[33px] rounded-[10px] pr-9"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-subtle-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  )
}

function PasswordSection() {
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)
  const [serverError, setServerError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)

  const rules = [
    { ok: next.length >= 8, label: 'At least 8 characters' },
    { ok: /[A-Z]/.test(next) && /[a-z]/.test(next), label: 'Upper and lowercase letters' },
    { ok: /\d/.test(next), label: 'At least one number' },
  ]
  const errors = {
    current: !current ? 'Enter your current password.' : undefined,
    next: rules.every((r) => r.ok) ? undefined : "New password doesn't meet the requirements.",
    confirm: confirm !== next || !confirm ? "Passwords don't match." : undefined,
  }
  const valid = !errors.current && !errors.next && !errors.confirm

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setServerError(undefined)
    if (!valid) return
    setSaving(true)
    try {
      await api.changePassword(current, next)
      toast('Password updated')
      setCurrent('')
      setNext('')
      setConfirm('')
      setSubmitted(false)
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (msg?: string) => submitted && msg && <span className="text-2xs text-danger">{msg}</span>

  return (
    <form onSubmit={submit} noValidate>
      <SectionTitle>Password</SectionTitle>
      <p className="mt-1 text-xs text-muted-foreground">Update the password you use to sign in.</p>
      <div className="mt-4 flex max-w-[420px] flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">Current password</Label>
          <PasswordInput id="current-password" value={current} onChange={setCurrent} autoComplete="current-password" />
          {fieldError(errors.current)}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput id="new-password" value={next} onChange={setNext} autoComplete="new-password" />
          <ul className="flex flex-col gap-0.5">
            {rules.map((r) => (
              <li key={r.label} className={cn('text-2xs transition-colors', r.ok ? 'text-chip-green-fg' : 'text-subtle-foreground')}>
                {r.ok ? '✓' : '•'} {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {fieldError(errors.confirm)}
        </div>
        {serverError && <p className="text-xs text-danger">{serverError}</p>}
      </div>
      <div className="mt-[26px] flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={saving || !current || !next || !confirm}
          className="h-7 rounded-[10px] px-4 text-xs"
        >
          {saving ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </form>
  )
}

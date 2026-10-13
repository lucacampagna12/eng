import { Loader2, LogOut, MailCheck } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/misc'
import { useAuth } from '@/store/auth'

/** Shows login / activation / password-reset screens until the user may use the app. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuth((s) => s.status)
  const init = useAuth((s) => s.init)

  React.useEffect(() => init(), [init])

  switch (status) {
    case 'disabled':
    case 'ready':
      return <>{children}</>
    case 'loading':
      return (
        <Screen>
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </Screen>
      )
    case 'signedOut':
      return <LoginScreen />
    case 'inactive':
      return <InactiveScreen />
    case 'recovery':
      return <NewPasswordScreen />
  }
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="ENG" className="size-14 rounded-2xl border border-border-strong" />
        </div>
        {children}
      </div>
    </div>
  )
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-popover">
      <h1 className="text-lg font-semibold">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </div>
  )
}

function Field({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="h-10 rounded-lg" {...props} />
    </div>
  )
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
      {children}
    </p>
  )
}

function LoginScreen() {
  const { signIn, sendReset } = useAuth()
  const [mode, setMode] = React.useState<'login' | 'reset' | 'sent'>('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string>()
  const [busy, setBusy] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(undefined)
    const err = mode === 'login' ? await signIn(email.trim(), password) : await sendReset(email.trim())
    setBusy(false)
    if (err) setError(err)
    else if (mode === 'reset') setMode('sent')
  }

  if (mode === 'sent') {
    return (
      <Screen>
        <Card title="Check your email" description={`If ${email} has an account, you'll get a link to choose a new password.`}>
          <MailCheck className="mx-auto mb-4 size-8 text-accent" />
          <Button className="w-full" onClick={() => setMode('login')}>
            Back to sign in
          </Button>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen>
      <Card
        title={mode === 'login' ? 'Sign in to ENG' : 'Reset your password'}
        description={mode === 'login' ? 'Use the account your admin created for you.' : "We'll email you a reset link."}
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode === 'login' && (
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" variant="primary" disabled={busy} className="h-10 w-full rounded-lg">
            {busy && <Loader2 className="animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Send reset link'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'reset' : 'login')
              setError(undefined)
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {mode === 'login' ? 'Forgot your password?' : 'Back to sign in'}
          </button>
        </form>
      </Card>
    </Screen>
  )
}

function InactiveScreen() {
  const { session, signOut } = useAuth()
  return (
    <Screen>
      <Card
        title="Waiting for access"
        description={`${session?.user.email ?? 'Your account'} is signed in, but an admin still has to activate it before you can see the workspace.`}
      >
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => window.location.reload()}>
            Check again
          </Button>
          <Button className="flex-1" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </Card>
    </Screen>
  )
}

function NewPasswordScreen() {
  const setNewPassword = useAuth((s) => s.setNewPassword)
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState<string>()
  const [busy, setBusy] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    setBusy(true)
    const err = await setNewPassword(password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <Screen>
      <Card title="Choose a new password">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id="new-password" label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Field id="confirm-password" label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" variant="primary" disabled={busy} className="h-10 w-full rounded-lg">
            {busy && <Loader2 className="animate-spin" />}
            Save password
          </Button>
        </form>
      </Card>
    </Screen>
  )
}

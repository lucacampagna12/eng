import { format } from 'date-fns'
import { CalendarDays, Plus } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/common'
import { toast } from '@/components/common/Toaster'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/misc'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SelectMenu } from '@/components/ui/select-menu'
import { useData } from '@/store/data'
import { useUser } from '@/store/user'
import { PROJECT_TYPES, type ProjectType } from '@/types'

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function NewProjectDialog({
  open,
  onOpenChange,
  defaultClientId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultClientId?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {/* The form only mounts while open, so its state starts fresh every time. */}
        <NewProjectForm onClose={() => onOpenChange(false)} defaultClientId={defaultClientId} />
      </DialogContent>
    </Dialog>
  )
}

function NewProjectForm({ onClose, defaultClientId }: { onClose: () => void; defaultClientId?: string }) {
  const navigate = useNavigate()
  const { clients, users, projects, createProject, createClient } = useData()
  const me = useUser((s) => s.user)
  const services = [...new Set(projects.map((p) => p.service))].sort()

  const [title, setTitle] = React.useState('')
  const [clientId, setClientId] = React.useState(defaultClientId)
  const [type, setType] = React.useState<ProjectType>('Organic')
  const [service, setService] = React.useState(services[0] ?? '')
  const [newClient, setNewClient] = React.useState<string>()
  const [assigneeId, setAssigneeId] = React.useState(me?.id)
  const [due, setDue] = React.useState<Date>()
  const [saving, setSaving] = React.useState(false)

  const valid = clientId && service.trim() && assigneeId && due

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const d = new Date(due)
    d.setHours(11)
    const project = await createProject({
      title: title.trim() || undefined,
      clientId,
      type,
      service: service.trim(),
      assigneeId,
      status: 'New',
      ownerId: me?.id ?? '',
      approverId: undefined,
      dueDate: d.toISOString(),
      archived: false,
    })
    setSaving(false)
    onClose()
    toast(`Project ${project.title} created`)
    navigate(`/projects/${project.id}`)
  }

  return (
    <>
      <DialogTitle>New project</DialogTitle>
      <DialogDescription>Leave the title empty to use the next project number.</DialogDescription>
      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title (optional)" htmlFor="np-title">
            <Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. ADS CLARA BENÍTEZ #5" />
          </Field>
        </div>
        <Field label="Client">
          {newClient === undefined ? (
            <div className="flex gap-1.5">
              <SelectMenu
                value={clientId}
                onChange={setClientId}
                placeholder={clients.length ? 'Select client' : 'No clients yet'}
                options={clients.map((c) => ({
                  value: c.id,
                  label: c.name,
                  prefix: <Avatar name={c.name} src={c.avatarUrl} size={16} />,
                }))}
              />
              <Button size="md" onClick={() => setNewClient('')} className="shrink-0" aria-label="New client">
                <Plus />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Input
                autoFocus
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="Client name"
                aria-label="New client name"
                onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setNewClient(undefined))}
              />
              <Button
                size="md"
                variant="primary"
                disabled={!newClient.trim()}
                onClick={async () => {
                  const created = await createClient(newClient.trim())
                  setClientId(created.id)
                  setNewClient(undefined)
                }}
              >
                Add
              </Button>
            </div>
          )}
        </Field>
        <Field label="Type">
          <SelectMenu value={type} onChange={(v) => setType(v as ProjectType)} options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="Service">
          <Input value={service} onChange={(e) => setService(e.target.value)} list="np-services" placeholder="e.g. Starter 15 Vids" />
          <datalist id="np-services">
            {services.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Assignee">
          <SelectMenu
            value={assigneeId}
            onChange={setAssigneeId}
            options={users.map((u) => ({ value: u.id, label: u.name, prefix: <Avatar name={u.name} size={16} /> }))}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Due date">
            <Popover>
              <PopoverTrigger className="flex h-8 w-full items-center gap-2 rounded-md border border-border bg-elevated px-3 text-left text-sm transition-colors duration-150 hover:border-border-strong">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                <span className={due ? '' : 'text-subtle-foreground'}>{due ? format(due, 'MMM d, yyyy') : 'Pick a date'}</span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={due} onSelect={setDue} />
              </PopoverContent>
            </Popover>
          </Field>
        </div>
        <DialogFooter className="mt-2 sm:col-span-2">
          <Button size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" type="submit" disabled={!valid || saving}>
            {saving ? 'Creating…' : 'Create project'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export function NewTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <NewTaskForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function NewTaskForm({ onClose }: { onClose: () => void }) {
  const { projects, createTask } = useData()
  const me = useUser((s) => s.user)
  const [title, setTitle] = React.useState('')
  const [projectId, setProjectId] = React.useState<string>()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !projectId || !me) return
    await createTask({ title: title.trim(), projectId, assigneeId: me.id })
    onClose()
    toast('Task created')
  }

  return (
    <>
      <DialogTitle>New task</DialogTitle>
      <DialogDescription>The task will be assigned to you.</DialogDescription>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <Field label="Title" htmlFor="nt-title">
          <Input id="nt-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
        </Field>
        <Field label="Project">
          <SelectMenu
            value={projectId}
            onChange={setProjectId}
            placeholder="Select project"
            options={projects.filter((p) => !p.archived).map((p) => ({ value: p.id, label: p.title }))}
          />
        </Field>
        <DialogFooter className="mt-2">
          <Button size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" type="submit" disabled={!title.trim() || !projectId}>
            Create task
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

import { Check, CircleCheck, Copy, EllipsisVertical, Link2, Mic, Share, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/components/common/Toaster'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input, Label, Switch } from '@/components/ui/misc'
import { useData } from '@/store/data'
import type { Project } from '@/types'
import { CreateApprovalWorkflow } from './CreateApprovalWorkflow'

type Modal = 'approval' | 'share' | 'delete'

const itemClass = 'h-8 gap-2.5 px-2.5 text-[13px] [&_svg]:size-4'

export function ActionsMenu({
  project,
  onAddAudio,
  projectsHref,
}: {
  project: Project
  onAddAudio: () => void
  projectsHref: string
}) {
  const [modal, setModal] = React.useState<Modal>()
  const close = (o: boolean) => !o && setModal(undefined)

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label="Project actions"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 outline-none hover:bg-hover hover:text-foreground data-[state=open]:bg-hover data-[state=open]:text-foreground"
        >
          <EllipsisVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px] rounded-xl p-1">
          <DropdownMenuItem className={itemClass} onSelect={() => setModal('approval')}>
            <CircleCheck /> Create Approval
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={itemClass} onSelect={onAddAudio}>
            <Mic /> Add Audio
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={itemClass} onSelect={() => setModal('share')}>
            <Share /> Share Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive className={itemClass} onSelect={() => setModal('delete')}>
            <Trash2 /> Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={modal === 'approval'} onOpenChange={close}>
        <DialogContent className="max-h-[calc(100vh-32px)] max-w-[768px] overflow-y-auto p-6" onOpenAutoFocus={(e) => e.preventDefault()}>
          <CreateApprovalWorkflow project={project} onClose={() => setModal(undefined)} />
        </DialogContent>
      </Dialog>
      <Dialog open={modal === 'share'} onOpenChange={close}>
        <DialogContent>
          <ShareForm project={project} />
        </DialogContent>
      </Dialog>
      <Dialog open={modal === 'delete'} onOpenChange={close}>
        <DialogContent>
          <DeleteForm project={project} onCancel={() => setModal(undefined)} projectsHref={projectsHref} />
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------- Share ----------

function ShareForm({ project }: { project: Project }) {
  const [copied, setCopied] = React.useState(false)
  const [isPublic, setIsPublic] = React.useState(false)
  const link = `${window.location.origin}/projects/${project.id}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      /* clipboard unavailable: the input is still selectable */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <DialogTitle>Share project</DialogTitle>
      <DialogDescription>Anyone on your team with this link can open {project.title}.</DialogDescription>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle-foreground" />
          <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Project link" className="pl-8 text-xs" />
        </div>
        <Button size="md" variant={copied ? 'secondary' : 'primary'} onClick={copy} className="w-[104px]">
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </div>
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-elevated px-3 py-2.5">
        <span>
          <span className="block text-sm font-medium">Public read-only link</span>
          <span className="block text-2xs text-muted-foreground">
            {isPublic ? 'Anyone with the link can view this project.' : 'Only team members can open the link.'}
          </span>
        </span>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} aria-label="Public read-only link" />
      </label>
    </>
  )
}

// ---------- Delete ----------

function DeleteForm({ project, onCancel, projectsHref }: { project: Project; onCancel: () => void; projectsHref: string }) {
  const navigate = useNavigate()
  const deleteProjects = useData((s) => s.deleteProjects)
  const [typed, setTyped] = React.useState('')
  const matches = typed.trim() === project.title

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matches) return
    navigate(projectsHref)
    await deleteProjects([project.id])
    toast(`Deleted ${project.title}`)
  }

  return (
    <form onSubmit={submit}>
      <DialogTitle>Delete project</DialogTitle>
      <DialogDescription>
        This permanently deletes <span className="font-semibold text-foreground">{project.title}</span> with its script and media.
        This can't be undone.
      </DialogDescription>
      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="confirm-title">
          Type <span className="font-semibold">{project.title}</span> to confirm
        </Label>
        <Input id="confirm-title" autoFocus autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </div>
      <DialogFooter>
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="danger" type="submit" disabled={!matches}>
          Delete project
        </Button>
      </DialogFooter>
    </form>
  )
}

import { Archive, ArchiveRestore, Copy, EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/components/common/Toaster'
import { ConfirmDialog } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { canCreateProjects } from '@/lib/permissions'
import { useData } from '@/store/data'
import { useUser } from '@/store/user'
import type { Project } from '@/types'

/** Kebab (⋮) menu shared by the full and compact project cards. */
export function ProjectMenu({ project, className }: { project: Project; className?: string }) {
  const navigate = useNavigate()
  const { updateProjects, duplicateProject, deleteProjects } = useData()
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Duplicating creates a project, which only the admin and managers may do.
  const canDuplicate = canCreateProjects(useUser((s) => s.user))

  // Portaled menu/dialog events still bubble through the React tree; keep them away from the card's onClick.
  return (
    <div className="contents" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Project actions"
            className={cn(
              'flex h-6 w-4 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground data-[state=open]:text-foreground',
              className,
            )}
          >
            <EllipsisVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => navigate(`/projects/${project.id}?edit=1`)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          {canDuplicate && (
            <DropdownMenuItem
              onSelect={async () => {
                await duplicateProject(project.id)
                toast(`Duplicated ${project.title}`)
              }}
            >
              <Copy /> Duplicate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={async () => {
              await updateProjects([project.id], { archived: !project.archived })
              toast(project.archived ? `Restored ${project.title}` : `Archived ${project.title}`)
            }}
          >
            {project.archived ? <ArchiveRestore /> : <Archive />}
            {project.archived ? 'Unarchive' : 'Archive'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${project.title}?`}
        description="This project and its content will be permanently removed. This can't be undone."
        onConfirm={async () => {
          await deleteProjects([project.id])
          toast(`Deleted ${project.title}`)
        }}
      />
    </div>
  )
}

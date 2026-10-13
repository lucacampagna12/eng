import { Plus, SquareCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, PageHeader, Panel } from '@/components/common'
import { NewTaskDialog } from '@/components/home/dialogs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { useUser } from '@/store/user'

export function TasksPage() {
  const { tasks, projects, toggleTask } = useData()
  const me = useUser((s) => s.user)
  const [open, setOpen] = useState(false)
  const mine = tasks.filter((t) => t.assigneeId === me?.id).sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <>
      <PageHeader title="Tasks" />
      <div className="mx-auto w-full max-w-[900px] px-4 pt-4 md:px-6 md:pt-8">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">My tasks</h2>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus /> New Task
            </Button>
          </div>
          {mine.length === 0 ? (
            <EmptyState icon={SquareCheck} title="No tasks assigned" description="Tasks assigned to you will appear here." className="py-16" />
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {mine.map((t) => {
                const project = byId(projects, t.projectId)
                return (
                  <li key={t.id} className="flex h-10 items-center gap-3">
                    <Checkbox round checked={t.done} onCheckedChange={() => toggleTask(t.id)} aria-label={`Complete ${t.title}`} className="size-4" />
                    <span className={cn('flex-1 truncate text-sm', t.done && 'text-subtle-foreground line-through')}>{t.title}</span>
                    {project && (
                      <Link to={`/projects/${project.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                        {project.title}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
      <NewTaskDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

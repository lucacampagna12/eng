import { formatDistanceToNow } from 'date-fns'
import { ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, EmptyState, PageHeader, Panel } from '@/components/common'
import { isUserApprover } from '@/lib/approvals'
import { cn } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { useUser } from '@/store/user'
import type { Approval } from '@/types'

export function ApprovalsPage() {
  const { approvals } = useData()
  const me = useUser((s) => s.user)
  const received = approvals.filter((a) => isUserApprover(a, me?.id ?? ''))
  const sent = approvals.filter((a) => a.requestedBy === me?.id)

  return (
    <>
      <PageHeader title="Approvals" />
      <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-4 px-4 pt-4 md:grid-cols-2 md:px-6 md:pt-8">
        <ApprovalList title="Received" items={received} direction="received" />
        <ApprovalList title="Sent" items={sent} direction="sent" />
      </div>
    </>
  )
}

function ApprovalList({ title, items, direction }: { title: string; items: Approval[]; direction: 'received' | 'sent' }) {
  const { projects, users } = useData()
  return (
    <Panel className="p-4">
      <h2 className="text-base font-semibold">
        {title} <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={`No ${title.toLowerCase()}`} className="py-16" />
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((a) => {
            const project = byId(projects, a.projectId)
            const other = byId(users, direction === 'received' ? a.requestedBy : a.approvers.find((ap) => ap.kind === 'user')?.id)
            return (
              <li key={a.id}>
                <Link to={`/approvals/${a.id}`} className="-mx-2 flex h-12 items-center gap-3 rounded-md px-2 transition-colors hover:bg-hover">
                  <Avatar name={other?.name ?? '?'} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project?.title ?? 'Deleted project'}</p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {direction === 'received' ? 'From' : 'To'} {other?.name} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-2xs font-medium capitalize',
                      a.status === 'approved'
                        ? 'bg-chip-green-bg text-chip-green-fg'
                        : a.status === 'changes_requested'
                          ? 'bg-danger/15 text-danger'
                          : 'bg-chip-yellow-bg text-chip-yellow-fg',
                    )}
                  >
                    {a.status.replace('_', ' ')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

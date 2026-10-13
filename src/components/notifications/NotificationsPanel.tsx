import { formatDistanceToNow } from 'date-fns'
import { BellOff, Check, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/common'
import { Hint } from '@/components/ui/misc'
import { PopoverContent } from '@/components/ui/popover'
import { notificationMessage } from '@/lib/notifications'
import { cn, formatCount } from '@/lib/utils'
import { byId, useData } from '@/store/data'
import { selectUnseenCount, useNotifications } from '@/store/notifications'
import type { Notification } from '@/types'

type Tab = 'new' | 'seen'

export function NotificationsPanel() {
  return (
    <PopoverContent
      side="right"
      align="start"
      sideOffset={13}
      className="flex max-h-[min(540px,calc(100vh-40px))] w-[380px] flex-col overflow-hidden p-0"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <NotificationsBody />
    </PopoverContent>
  )
}

// Mounted only while the popover/sheet is open, so the tab always starts on "New".
export function NotificationsBody() {
  const [tab, setTab] = useState<Tab>('new')
  const items = useNotifications((s) => s.items)
  const unseen = useNotifications(selectUnseenCount)
  const markAllSeen = useNotifications((s) => s.markAllSeen)

  const list = items.filter((n) => (tab === 'new' ? !n.seen : n.seen))

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-2.5 pt-2.5 pb-1.5">
        <div role="tablist" className="flex h-11 flex-1 items-center rounded-[10px] bg-elevated-hover p-[3px]">
          <SegmentButton active={tab === 'new'} onClick={() => setTab('new')}>
            New
            {unseen > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-2xs font-semibold text-white">
                {formatCount(unseen)}
              </span>
            )}
          </SegmentButton>
          <SegmentButton active={tab === 'seen'} onClick={() => setTab('seen')}>
            Seen
          </SegmentButton>
        </div>
        <Hint label="Mark all as read">
          <button
            onClick={markAllSeen}
            disabled={unseen === 0}
            aria-label="Mark all as read"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground disabled:opacity-40"
          >
            <CheckCheck className="size-4" />
          </button>
        </Hint>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-1">
        {list.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <BellOff className="mb-3 size-5 text-muted-foreground" strokeWidth={1.75} />
            <p className="text-sm font-semibold">{tab === 'new' ? "You're all caught up" : 'Nothing seen yet'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tab === 'new' ? 'New activity will appear here.' : 'Notifications you open will appear here.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex h-full flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-150',
        active ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const navigate = useNavigate()
  const users = useData((s) => s.users)
  const projects = useData((s) => s.projects)
  const markSeen = useNotifications((s) => s.markSeen)
  const setOpen = useNotifications((s) => s.setOpen)
  const actor = byId(users, n.actorId)
  const project = byId(projects, n.projectId)

  const open = () => {
    markSeen(n.id)
    setOpen(false)
    if (project) navigate(`/projects/${project.id}`)
  }

  return (
    <li className="group relative">
      <button
        onClick={open}
        className="-mx-1.5 flex w-[calc(100%+12px)] flex-col gap-[5px] rounded-md px-2.5 py-[11px] text-left transition-colors duration-150 hover:bg-hover"
      >
        <div className="flex w-full items-center gap-2">
          <Avatar name={actor?.name ?? '?'} size={22} className="text-[9px]" />
          <span className="truncate text-sm font-semibold text-foreground">{actor?.name ?? 'Someone'}</span>
          <span className="ml-auto shrink-0 pl-2 text-2xs text-muted-foreground">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{notificationMessage(n, project)}</p>
      </button>
      {!n.seen && (
        <Hint label="Mark as read" side="left">
          <button
            onClick={() => markSeen(n.id)}
            aria-label="Mark as read"
            className="absolute top-[24px] left-[-6px] flex size-4 items-center justify-center rounded text-subtle-foreground opacity-70 transition-colors duration-150 hover:bg-elevated-hover hover:text-foreground hover:opacity-100"
          >
            <Check className="size-3" />
          </button>
        </Hint>
      )}
    </li>
  )
}

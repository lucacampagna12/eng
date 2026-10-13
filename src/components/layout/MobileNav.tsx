import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ClipboardCheck, FolderKanban, House, Inbox, SquareCheck, type LucideIcon } from 'lucide-react'
import { NavLink, useMatch } from 'react-router-dom'
import { NotificationsBody } from '@/components/notifications/NotificationsPanel'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn, initials } from '@/lib/utils'
import { selectUnseenCount, useNotifications } from '@/store/notifications'
import { useUser } from '@/store/user'

const itemClass =
  'relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors duration-150 active:bg-hover'

function Tab({ to, label, icon: Icon, end }: { to: string; label: string; icon: LucideIcon; end?: boolean }) {
  const active = !!useMatch({ path: to, end: end ?? false })
  return (
    <NavLink to={to} aria-label={label} className={cn(itemClass, active && 'text-accent')}>
      <Icon className="size-5" strokeWidth={1.75} />
      {label}
    </NavLink>
  )
}

/** Bottom tab bar that replaces the icon rail on phones (< md). */
export function MobileNav() {
  const isDesktop = useIsDesktop()
  const user = useUser((s) => s.user)
  const open = useNotifications((s) => s.open)
  const setOpen = useNotifications((s) => s.setOpen)
  const unseen = useNotifications(selectUnseenCount)
  const accountActive = !!useMatch({ path: '/account', end: false })

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(56px+env(safe-area-inset-bottom))] border-t border-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <Tab to="/" label="Home" icon={House} end />
        <Tab to="/projects" label="Projects" icon={FolderKanban} />
        <Tab to="/tasks" label="Tasks" icon={SquareCheck} />
        <Tab to="/approvals" label="Approvals" icon={ClipboardCheck} />
        <button onClick={() => setOpen(true)} aria-label="Inbox" className={cn(itemClass, open && 'text-accent')}>
          <span className="relative">
            <Inbox className="size-5" strokeWidth={1.75} />
            {unseen > 0 && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-danger ring-2 ring-sidebar" />}
          </span>
          Inbox
        </button>
        <NavLink to="/account" aria-label="My Account" className={cn(itemClass, accountActive && 'text-accent')}>
          <span
            className={cn(
              'flex size-5 items-center justify-center overflow-hidden rounded-full bg-primary text-[9px] font-bold text-primary-foreground',
              accountActive && 'ring-2 ring-accent/40',
            )}
          >
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : initials(user?.name ?? '?')}
          </span>
          Account
        </NavLink>
      </nav>

      {/* Inbox as a bottom sheet on phones */}
      <DialogPrimitive.Root open={open && !isDesktop} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-popover outline-none"
          >
            <DialogPrimitive.Title className="sr-only">Notifications</DialogPrimitive.Title>
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
            <NotificationsBody />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

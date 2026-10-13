import { ClipboardCheck, FolderKanban, House, Inbox, Moon, SquareCheck, Sun, type LucideIcon } from 'lucide-react'
import * as React from 'react'
import { NavLink, useMatch } from 'react-router-dom'
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel'
import { Popover, PopoverAnchor, PopoverTrigger } from '@/components/ui/popover'
import { Hint } from '@/components/ui/misc'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn, initials } from '@/lib/utils'
import { selectUnseenCount, useNotifications } from '@/store/notifications'
import { useTheme, useUser } from '@/store/user'

const itemClass =
  'relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground'
const activeClass = 'bg-active text-accent hover:bg-active hover:text-accent'

// NavLink's function className doesn't survive Radix Slot merging (Tooltip trigger), so compute "active" here.
function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: LucideIcon; end?: boolean }) {
  const isActive = !!useMatch({ path: to, end: end ?? false })
  return (
    <Hint label={label} side="right">
      <NavLink to={to} aria-label={label} className={cn(itemClass, isActive && activeClass)}>
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </NavLink>
    </Hint>
  )
}

export function Sidebar() {
  const user = useUser((s) => s.user)
  const { theme, toggle } = useTheme()
  const open = useNotifications((s) => s.open)
  const setOpen = useNotifications((s) => s.setOpen)
  const unseen = useNotifications(selectUnseenCount)
  const isDesktop = useIsDesktop()
  const anchorRef = React.useRef<HTMLDivElement>(null)
  const accountActive = !!useMatch({ path: '/account', end: false })

  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-[62px] shrink-0 flex-col md:flex items-center border-r border-border bg-sidebar pt-[54px] pb-4">
      <Popover open={open && isDesktop} onOpenChange={setOpen}>
        {/* The panel is anchored to the top of the rail so it lines up with the logo, like the reference. */}
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="flex flex-col items-center">
            <Hint label="Home" side="right">
              <NavLink
                to="/"
                aria-label="Logo, go to home"
                className="flex size-10 items-center justify-center overflow-hidden rounded-[10px] border border-border-strong bg-logo-bg transition-colors duration-150 hover:border-accent"
              >
                <img src="/logo.png" alt="ENG" className="size-full object-cover" draggable={false} />
              </NavLink>
            </Hint>

            <nav className="mt-[17px] flex flex-col items-center gap-[11px]">
              <Hint label="Inbox" side="right">
                <PopoverTrigger asChild>
                  <button aria-label="Inbox" className={cn(itemClass, open && activeClass)}>
                    <Inbox className="size-[18px]" strokeWidth={1.75} />
                    {unseen > 0 && (
                      <span className="absolute top-[5px] right-[5px] size-[7px] rounded-full bg-danger ring-2 ring-background" />
                    )}
                  </button>
                </PopoverTrigger>
              </Hint>
              <NavItem to="/approvals" label="Approvals" icon={ClipboardCheck} />
            </nav>
          </div>
        </PopoverAnchor>
        <NotificationsPanel />
      </Popover>

      <nav className="mt-[39px] flex flex-col items-center gap-[15px]">
        <NavItem to="/" label="Home" icon={House} end />
        <NavItem to="/tasks" label="Tasks" icon={SquareCheck} />
        <NavItem to="/projects" label="Projects" icon={FolderKanban} />
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <Hint label={theme === 'dark' ? 'Light mode' : 'Dark mode'} side="right">
          <button aria-label="Toggle theme" onClick={toggle} className={itemClass}>
            {theme === 'dark' ? <Sun className="size-[18px]" strokeWidth={1.75} /> : <Moon className="size-[18px]" strokeWidth={1.75} />}
          </button>
        </Hint>
        <Hint label="My Account" side="right">
          <NavLink
            to="/account"
            aria-label="My Account"
            className={cn(
              'flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-shadow duration-150 hover:ring-2 hover:ring-border-strong',
              accountActive && 'ring-2 ring-border-strong',
            )}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="size-full rounded-full object-cover" />
            ) : (
              initials(user?.name ?? '?')
            )}
          </NavLink>
        </Hint>
      </div>
    </aside>
  )
}

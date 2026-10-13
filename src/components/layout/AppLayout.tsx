import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/misc'
import { useData } from '@/store/data'
import { useNotifications } from '@/store/notifications'
import { useUser } from '@/store/user'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const loadData = useData((s) => s.load)
  const loadNotifications = useNotifications((s) => s.load)
  const loadUser = useUser((s) => s.load)

  useEffect(() => {
    void loadUser()
    void loadData()
    void loadNotifications()
  }, [loadData, loadNotifications, loadUser])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        {/* Phones: leave room for the bottom tab bar */}
        <main className="flex min-w-0 flex-1 flex-col max-md:pb-[calc(56px+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </TooltipProvider>
  )
}

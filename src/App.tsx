import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/common/Toaster'
import { AppLayout } from '@/components/layout/AppLayout'
import { AccountPage } from '@/pages/Account'
import { ApprovalReviewPage } from '@/pages/ApprovalReview'
import { ApprovalsPage } from '@/pages/Approvals'
import { HomePage } from '@/pages/Home'
import { ProjectDetailPage } from '@/pages/ProjectDetail'
import { ProjectsPage } from '@/pages/Projects'
import { TasksPage } from '@/pages/Tasks'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Shared review link: full screen, outside the app shell */}
        <Route path="approvals/:id" element={<ApprovalReviewPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="account" element={<Navigate to="/account/profile" replace />} />
          <Route path="account/:section" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

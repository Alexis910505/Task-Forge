import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { AppShell } from '@/layouts/AppShell';
import { ActivityPage } from '@/pages/ActivityPage';
import { AssetsPage } from '@/pages/AssetsPage';
import { CreateTaskPage } from '@/pages/CreateTaskPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { KanbanPage } from '@/pages/KanbanPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TaskDetailPage } from '@/pages/TaskDetailPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { UsersRolesPage } from '@/pages/UsersRolesPage';

function BootScreen() {
  const { t } = useTranslation();
  return (
    <div className="relative flex min-h-full items-center justify-center bg-background text-on-surface-variant">
      <div className="absolute end-4 top-4">
        <LanguageToggle />
      </div>
      <div className="text-center">
        <BrandLogo className="mx-auto mb-6 h-14 w-14" alt={t('app.brand')} />
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-bold uppercase tracking-wide">{t('boot.loadingSession')}</p>
      </div>
    </div>
  );
}

export default function App() {
  const { ready, isAuthenticated } = useAuth();

  if (!ready) {
    return <BootScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/users" element={<UsersRolesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/tasks/new" element={<CreateTaskPage />} />
        <Route path="/tasks/:taskId/edit" element={<CreateTaskPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

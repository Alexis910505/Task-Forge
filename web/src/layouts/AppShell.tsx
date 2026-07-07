import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { NotificationsProvider } from '@/notifications/NotificationsContext';

export function AppShell() {
  return (
    <NotificationsProvider>
    <div className="min-h-full bg-background">
      <Sidebar />
      <div className="flex min-h-full flex-col md:pl-sidebar-width">
        <TopBar />
        <main className="flex-1 px-4 py-6 pt-20 md:px-6">
          <div className="mx-auto max-w-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </NotificationsProvider>
  );
}

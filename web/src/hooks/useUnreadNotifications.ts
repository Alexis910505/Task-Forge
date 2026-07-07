import { useNotifications } from '@/notifications/NotificationsContext';

/** Contador global de notificaciones sin leer (TopBar, etc.). */
export function useUnreadNotifications(_enabled = true) {
  const { unreadCount, refreshUnread } = useNotifications();
  return { unreadCount, refreshUnread };
}

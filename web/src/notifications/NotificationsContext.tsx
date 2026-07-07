import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/auth/AuthContext';
import { apiJson } from '@/lib/api';

type NotificationsContextValue = {
  unreadCount: number;
  notificationsRevision: number;
  refreshUnread: () => Promise<void>;
  /** Tras marcar una notificación como leída (actualiza badge y avisa a la lista). */
  onNotificationRead: (wasUnread?: boolean) => Promise<void>;
  /** Tras marcar todas como leídas. */
  onAllNotificationsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsRevision, setNotificationsRevision] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    const res = await apiJson<{ count: number }>('/notifications/unread-count');
    if (res.ok && res.data) {
      setUnreadCount(res.data.count);
    }
  }, [isAuthenticated]);

  const bumpList = useCallback(() => {
    setNotificationsRevision((r) => r + 1);
  }, []);

  const onNotificationRead = useCallback(
    async (wasUnread = true) => {
      if (wasUnread) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      bumpList();
      await refreshUnread();
    },
    [bumpList, refreshUnread],
  );

  const onAllNotificationsRead = useCallback(async () => {
    setUnreadCount(0);
    bumpList();
    await refreshUnread();
  }, [bumpList, refreshUnread]);

  useEffect(() => {
    void refreshUnread();
    if (!isAuthenticated) return;

    const id = window.setInterval(() => void refreshUnread(), 60_000);
    const onFocus = () => void refreshUnread();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshUnread();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, refreshUnread]);

  const value = useMemo(
    () => ({
      unreadCount,
      notificationsRevision,
      refreshUnread,
      onNotificationRead,
      onAllNotificationsRead,
    }),
    [
      unreadCount,
      notificationsRevision,
      refreshUnread,
      onNotificationRead,
      onAllNotificationsRead,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { useNotifications } from '@/notifications/NotificationsContext';
import { apiFetch, apiJson } from '@/lib/api';
import {
  notificationTypeLabel,
  notificationVisual,
  parseNotificationMetadata,
  type NotificationTypeKey,
} from '@/lib/notificationPresentation';
import { formatRelativeTime } from '@/lib/relativeTime';
import { taskStatusPillClass } from '@/lib/taskStatusColors';

export type NotificationRow = {
  id: string;
  type: NotificationTypeKey;
  title: string;
  body?: string | null;
  read: boolean;
  metadata?: unknown;
  createdAt: string;
};

type NotificationSection = {
  key: 'newAlerts' | 'yesterday' | 'earlier';
  items: NotificationRow[];
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupNotifications(items: NotificationRow[]): NotificationSection[] {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const newAlerts: NotificationRow[] = [];
  const yesterday: NotificationRow[] = [];
  const earlier: NotificationRow[] = [];

  for (const n of items) {
    const at = new Date(n.createdAt);
    if (!n.read) {
      newAlerts.push(n);
      continue;
    }
    if (at >= yesterdayStart && at < todayStart) {
      yesterday.push(n);
      continue;
    }
    if (at < yesterdayStart) {
      earlier.push(n);
      continue;
    }
    yesterday.push(n);
  }

  const sections: NotificationSection[] = [];
  if (newAlerts.length > 0) sections.push({ key: 'newAlerts', items: newAlerts });
  if (yesterday.length > 0) sections.push({ key: 'yesterday', items: yesterday });
  if (earlier.length > 0) sections.push({ key: 'earlier', items: earlier });
  return sections;
}

function formatYesterdayLabel(locale: string): string {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return y.toLocaleDateString(locale.startsWith('es') ? 'es' : 'en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'es';
  const {
    unreadCount: globalUnreadCount,
    notificationsRevision,
    refreshUnread,
    onNotificationRead,
    onAllNotificationsRead,
  } = useNotifications();

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const res = await apiJson<NotificationRow[]>('/notifications');
      if (!opts?.silent) setLoading(false);
      if (!res.ok) {
        setError(t('common.loadError', { status: res.status }));
        setItems([]);
        return;
      }
      setError(null);
      setItems(res.data ?? []);
      await refreshUnread();
    },
    [t, refreshUnread],
  );

  const skipRevisionReload = useRef(true);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (skipRevisionReload.current) {
      skipRevisionReload.current = false;
      return;
    }
    void load({ silent: true });
  }, [notificationsRevision, load]);

  const sections = useMemo(() => groupNotifications(items), [items]);
  const unreadCount = globalUnreadCount;

  async function markRead(id: string) {
    const target = items.find((n) => n.id === id);
    const wasUnread = target ? !target.read : false;
    if (wasUnread) {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    if (!wasUnread) return;
    await onNotificationRead(true);
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    setMarkingAll(false);
    await onAllNotificationsRead();
  }

  return (
    <div>
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              disabled={markingAll}
              onClick={() => void markAllRead()}
              className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold uppercase text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              {markingAll ? t('notifications.markingAll') : t('notifications.markAllRead')}
            </button>
          ) : null
        }
      />

      {!loading && items.length > 0 ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="rounded-xl bg-primary-container p-3 text-on-primary-container">
              <span className="material-symbols-outlined">mark_email_unread</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                {t('notifications.statUnread')}
              </p>
              <p className="text-2xl font-semibold text-on-surface">{unreadCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="rounded-xl bg-secondary-container p-3 text-on-secondary-container">
              <span className="material-symbols-outlined">notifications</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                {t('notifications.statTotal')}
              </p>
              <p className="text-2xl font-semibold text-on-surface">{items.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="rounded-xl bg-secondary-container p-3 text-on-secondary-container">
              <span className="material-symbols-outlined">assignment</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                {t('notifications.statAssignments')}
              </p>
              <p className="text-2xl font-semibold text-on-surface">
                {items.filter((n) => n.type === 'TASK_ASSIGNED').length}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <span className="material-symbols-outlined text-3xl">notifications_none</span>
          </div>
          <p className="mt-4 text-on-surface-variant">{t('notifications.empty')}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{t('notifications.emptyHint')}</p>
        </div>
      ) : null}

      {!loading && sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.key}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                {section.key === 'newAlerts' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                    {t(`notifications.section_${section.key}`)}
                  </span>
                ) : section.key === 'yesterday' ? (
                  t('notifications.sectionYesterday', { date: formatYesterdayLabel(locale) })
                ) : (
                  t(`notifications.section_${section.key}`)
                )}
              </h2>
              <ul className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant/30">
                {section.items.map((n) => (
                  <NotificationCard
                    key={n.id}
                    item={n}
                    locale={locale}
                    t={t}
                    onMarkRead={() => markRead(n.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NotificationCard({
  item,
  locale,
  t,
  onMarkRead,
}: {
  item: NotificationRow;
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onMarkRead: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const meta = parseNotificationMetadata(item.metadata);
  const visual = notificationVisual(item.type);
  const typeLabel = notificationTypeLabel(item.type, t);
  const title = item.title || typeLabel;
  const taskLink = meta.taskId ? `/tasks/${meta.taskId}` : null;
  const isInteractive = Boolean(taskLink) || !item.read;

  async function handleActivate() {
    if (taskLink) {
      if (!item.read) await onMarkRead();
      navigate(taskLink);
      return;
    }
    if (!item.read) await onMarkRead();
  }

  return (
    <li
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? () => void handleActivate() : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                void handleActivate();
              }
            }
          : undefined
      }
      className={[
        'flex gap-4 p-6 transition-colors',
        isInteractive ? 'cursor-pointer' : '',
        !item.read ? 'bg-primary-container/5' : 'hover:bg-surface-container-low/50',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          visual.iconClass,
        ].join(' ')}
      >
        <span className="material-symbols-outlined text-xl">{visual.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              {typeLabel}
            </p>
            <h3 className="mt-0.5 font-semibold text-on-surface">{title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <time
              className="text-[10px] font-bold uppercase text-on-surface-variant"
              dateTime={item.createdAt}
            >
              {formatRelativeTime(item.createdAt, locale)}
            </time>
            {!item.read ? (
              <span className="h-2 w-2 rounded-full bg-primary" aria-label={t('common.unread')} />
            ) : null}
          </div>
        </div>

        {item.body ? (
          <p className="mt-2 text-sm text-on-surface-variant">{item.body}</p>
        ) : null}

        {meta.status ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            {t('notifications.statusChanged')}
            <span
              className={[
                'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase',
                taskStatusPillClass(meta.status),
              ].join(' ')}
            >
              {meta.status}
            </span>
          </p>
        ) : null}

        {meta.threadTitle || meta.taskTitle ? (
          <div className="mt-3 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
            {meta.threadTitle
              ? t('notifications.threadLabel', { name: meta.threadTitle })
              : meta.taskTitle}
          </div>
        ) : null}

      </div>
    </li>
  );
}

import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { activityIcon, activityTimelineMessage } from '@/lib/activityMessage';
import { apiJson } from '@/lib/api';
import { formatRelativeTime } from '@/lib/relativeTime';

type ActivityRow = {
  id: string;
  action: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  task?: { id: string; title: string } | null;
};

export function ActivityPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language ?? 'es';
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiJson<ActivityRow[]>('/activity/recent');
    setLoading(false);
    if (!res.ok) {
      setError(t('common.loadError', { status: res.status }));
      setItems([]);
      return;
    }
    setError(null);
    setItems(res.data ?? []);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title={t('activity.title')}
        subtitle={t('activity.subtitle')}
        actions={
          <Link
            to="/dashboard"
            className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold uppercase text-on-surface-variant hover:bg-surface-container-high"
          >
            {t('activity.backToDashboard')}
          </Link>
        }
      />
      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <ul className="mt-6 divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
        {items.length === 0 && !loading ? (
          <li className="p-6 text-center text-on-surface-variant">{t('dashboard.noActivity')}</li>
        ) : null}
        {items.map((entry) => {
          const userName = entry.user
            ? `${entry.user.firstName} ${entry.user.lastName}`.trim()
            : t('taskDetail.system');
          const initials = entry.user
            ? `${entry.user.firstName?.[0] ?? ''}${entry.user.lastName?.[0] ?? ''}`.toUpperCase()
            : 'S';
          const { icon, className } = activityIcon(entry.action);
          const taskId = entry.task?.id;
          return (
            <li key={entry.id} className="flex gap-4 p-6">
              <Avatar initials={initials || '?'} className="h-10 w-10 shrink-0 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-on-surface">
                  <span className="font-semibold">{userName}</span>{' '}
                  <span className="text-on-surface-variant">{activityTimelineMessage(entry, t)}</span>
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
                  <span className={`material-symbols-outlined text-sm ${className}`}>{icon}</span>
                  {formatRelativeTime(entry.createdAt, locale)}
                </p>
                {taskId ? (
                  <Link
                    to={`/tasks/${taskId}`}
                    className="mt-2 inline-block text-xs font-bold uppercase text-primary hover:underline"
                  >
                    {t('dashboard.viewTask')}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

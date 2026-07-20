import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { apiJson } from '@/lib/api';
import { formatDueDateLabel } from '@/lib/dueDates';
import { profileCredentials, profileSkills, taskRefCode } from '@/lib/profileExtras';
import { formatRelativeTime } from '@/lib/relativeTime';
import { roleLabel } from '@/lib/roleLabels';
import { taskStatusPillClass } from '@/lib/taskStatusColors';

type ProfilePayload = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    role: { id: string; name: string; organizationId: string };
    department?: { id: string; name: string } | null;
  };
  location: string | null;
  stats: {
    tasksCompleted: number;
    tasksCompletedMonth: number;
    monthTrendPercent: number | null;
    efficiencyPercent: number;
    avgResolutionHours: number | null;
    resolutionStable: boolean;
    openAssignments: number;
  };
  activeTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    projectName: string;
  }>;
};

function statusProfileClass(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-primary-container/20 text-primary';
    case 'REVIEW':
      return 'bg-secondary-container/50 text-secondary';
    case 'BACKLOG':
    case 'TODO':
      return 'bg-outline-variant/30 text-on-surface-variant';
    default:
      return taskStatusPillClass(status);
  }
}

function statusProfileLabel(status: string, t: (k: string) => string): string {
  const key = `profile.status.${status}`;
  const translated = t(key);
  return translated === key ? status.replace(/_/g, ' ') : translated;
}

function priorityDisplay(priority: string, t: (k: string) => string): { label: string; urgent: boolean } {
  if (priority === 'CRITICAL' || priority === 'HIGH') {
    return { label: t('profile.priorityUrgent'), urgent: true };
  }
  if (priority === 'MEDIUM') return { label: t('profile.priorityMedium'), urgent: false };
  return { label: t('profile.priorityLow'), urgent: false };
}

function formatTimeline(
  dueDate: string | null,
  locale: string,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  if (!dueDate) return t('profile.noDueDate');
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return t('profile.noDueDate');
  const diffMs = parsed.getTime() - Date.now();
  if (diffMs < 0) return t('profile.overdue');
  if (diffMs < 48 * 60 * 60 * 1000) {
    return t('profile.dueIn', { time: formatRelativeTime(dueDate, locale) });
  }
  return formatDueDateLabel(dueDate, locale) ?? t('profile.noDueDate');
}

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language ?? 'es';
  const navigate = useNavigate();
  const { user: sessionUser } = useAuth();
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiJson<ProfilePayload>('/users/me/profile');
    setLoading(false);
    if (!res.ok) {
      setError(t('common.loadError', { status: res.status }));
      setData(null);
      return;
    }
    setError(null);
    setData(res.data ?? null);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!sessionUser && !loading) {
    return null;
  }

  const user = data?.user ?? sessionUser;
  if (!user) {
    return <p className="text-sm text-on-surface-variant">{t('common.loading')}</p>;
  }

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const skills = profileSkills(user.department?.name);
  const credentials = profileCredentials(user.role.name, data?.stats.tasksCompleted ?? 0);
  const stats = data?.stats;

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <Avatar
              initials={initials}
              className="h-24 w-24 rounded-2xl border-2 border-primary/20 text-2xl md:h-32 md:w-32"
            />
            {(data?.user.isActive ?? true) ? (
              <span className="absolute -bottom-2 -right-2 rounded-lg border-2 border-background bg-tertiary p-1 text-on-tertiary">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </span>
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-on-surface md:text-3xl">
              {user.firstName} {user.lastName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded bg-secondary-container px-2 py-0.5 text-xs font-bold text-on-secondary-container">
                {roleLabel(user.role, t)}
              </span>
              {user.department ? (
                <span className="flex items-center gap-1 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-base">domain</span>
                  {user.department.name}
                </span>
              ) : null}
              {data?.location ? (
                <span className="flex items-center gap-1 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {data.location}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex w-full md:w-auto">
          <Link
            to="/profile/edit"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant px-6 py-2 text-xs font-bold uppercase text-on-surface-variant transition-colors hover:bg-surface-container-high md:flex-none"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            {t('profile.editProfile')}
          </Link>
        </div>
      </div>

      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}

      {stats ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:col-span-8">
            <StatCard
              label={t('profile.tasksCompleted')}
              icon="check_circle"
              iconClass="text-primary"
              value={stats.tasksCompleted.toLocaleString(locale)}
              trend={
                stats.monthTrendPercent != null
                  ? stats.monthTrendPercent >= 0
                    ? t('profile.trendUp', { value: stats.monthTrendPercent })
                    : t('profile.trendDown', { value: Math.abs(stats.monthTrendPercent) })
                  : undefined
              }
              trendUp={stats.monthTrendPercent != null && stats.monthTrendPercent >= 0}
            />
            <StatCard
              label={t('profile.efficiencyRating')}
              icon="bolt"
              iconClass="text-tertiary"
              value={`${stats.efficiencyPercent}%`}
              progress={stats.efficiencyPercent}
            />
            <StatCard
              label={t('profile.avgResolution')}
              icon="timer"
              iconClass="text-secondary"
              value={stats.avgResolutionHours != null ? `${stats.avgResolutionHours}h` : '—'}
              trend={
                stats.resolutionStable
                  ? t('profile.resolutionStable')
                  : t('profile.resolutionVariable')
              }
              trendNeutral
            />
          </div>

          <section className="col-span-12 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-4">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-on-surface">
              <span className="material-symbols-outlined text-primary">military_tech</span>
              {t('profile.skillsTitle')}
            </h2>
            <div className="mb-6 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold text-on-surface"
                >
                  {skill}
                </span>
              ))}
            </div>
            {credentials.length > 0 ? (
              <div className="space-y-4">
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className={[
                      'flex items-center gap-3 rounded-lg border p-3',
                      cred.variant === 'tertiary'
                        ? 'border-tertiary-container/20 bg-tertiary-container/10'
                        : 'border-primary-container/20 bg-primary-container/10',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'material-symbols-outlined',
                        cred.variant === 'tertiary' ? 'text-tertiary' : 'text-primary',
                      ].join(' ')}
                    >
                      {cred.variant === 'tertiary' ? 'verified_user' : 'workspace_premium'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-on-surface">{t(cred.titleKey)}</p>
                      <p className="text-[11px] text-on-surface-variant">{t(cred.subtitleKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">{t('profile.noCredentials')}</p>
            )}
          </section>

          <section className="col-span-12 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface px-6 py-4">
              <h2 className="text-lg font-semibold text-on-surface">{t('profile.activeTasksTitle')}</h2>
              <span className="text-xs font-bold uppercase text-on-surface-variant">
                {t('profile.activeTasksTotal', { count: data?.activeTasks.length ?? 0 })}
              </span>
            </div>
            <div className="overflow-x-auto">
              {!data?.activeTasks.length ? (
                <p className="p-6 text-sm text-on-surface-variant">{t('profile.noActiveTasks')}</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('profile.colTask')}
                      </th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('profile.colStatus')}
                      </th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('profile.colPriority')}
                      </th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('profile.colTimeline')}
                      </th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {data.activeTasks.map((task) => {
                      const pri = priorityDisplay(task.priority, t);
                      return (
                        <tr
                          key={task.id}
                          className="cursor-pointer transition-colors hover:bg-surface-container-high"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                          <td className="px-6 py-4">
                            <p className="font-bold text-on-surface">{task.title}</p>
                            <p className="text-xs font-bold text-on-surface-variant">
                              {taskRefCode(task.id)}
                              {task.projectName ? ` · ${task.projectName}` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={[
                                'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                                statusProfileClass(task.status),
                              ].join(' ')}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {statusProfileLabel(task.status, t)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {pri.urgent ? (
                              <span className="flex items-center gap-1 text-xs font-bold uppercase text-error">
                                <span className="material-symbols-outlined text-base">priority_high</span>
                                {pri.label}
                              </span>
                            ) : (
                              <span className="text-xs font-bold uppercase text-on-surface-variant">
                                {pri.label}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">
                            {formatTimeline(task.dueDate, locale, t)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              className="p-2 text-on-surface-variant hover:text-primary"
                              aria-label={t('profile.openTask')}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tasks/${task.id}`);
                              }}
                            >
                              <span className="material-symbols-outlined">open_in_new</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      ) : null}

    </div>
  );
}

function StatCard({
  label,
  icon,
  iconClass,
  value,
  trend,
  trendUp,
  trendNeutral,
  progress,
}: {
  label: string;
  icon: string;
  iconClass: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
  progress?: number;
}) {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <div className="mb-4 flex items-start justify-between">
        <span className="text-xs font-bold uppercase text-on-surface-variant">{label}</span>
        <span className={`material-symbols-outlined ${iconClass}`}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-semibold text-on-surface md:text-3xl">{value}</div>
        {trend ? (
          <p
            className={[
              'mt-1 flex items-center gap-1 text-xs font-bold',
              trendNeutral
                ? 'text-on-surface-variant'
                : trendUp
                  ? 'text-tertiary'
                  : 'text-error',
            ].join(' ')}
          >
            {!trendNeutral ? (
              <span className="material-symbols-outlined text-sm">
                {trendUp ? 'trending_up' : 'trending_down'}
              </span>
            ) : (
              <span className="material-symbols-outlined text-sm">horizontal_rule</span>
            )}
            {trend}
          </p>
        ) : null}
        {progress != null ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full bg-tertiary"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { activityIcon, activityTimelineMessage } from '@/lib/activityMessage';
import { apiFetch } from '@/lib/api';
import { formatRelativeTime } from '@/lib/relativeTime';
import { TASK_STATUS_ORDER, taskStatusChartColor } from '@/lib/taskStatusColors';

type DashboardPeriod = 'daily' | 'weekly' | 'monthly';

type ActivityRow = {
  id: string;
  action: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  task?: { id: string; title: string } | null;
};

type DeptWorkload = {
  id: string;
  name: string;
  openTasks: number;
  totalTasks: number;
  completedTasks: number;
  memberCount: number;
  efficiency: number | null;
  loadLevel: 'critical' | 'balanced' | 'under';
};

type UrgentTaskRow = {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  reason: 'critical' | 'overdue' | 'both';
};

type DashboardSummary = {
  period: DashboardPeriod;
  usersActive: number;
  tasksTotal: number;
  tasksByStatus: Partial<Record<string, number>>;
  overdue: number;
  urgent: number;
  urgentTasks: UrgentTaskRow[];
  completedLast48h: number;
  tasksCreatedInPeriod: number;
  trendPercent: number | null;
  recentActivity: ActivityRow[];
  departmentWorkload: DeptWorkload[];
};

const PERIODS: DashboardPeriod[] = ['daily', 'weekly', 'monthly'];
const RECENT_ACTIVITY_LIMIT = 10;

const CHART_TRACK = '#e2e7ff';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language ?? 'es';
  const [period, setPeriod] = useState<DashboardPeriod>('daily');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadErrorStatus, setLoadErrorStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/dashboard/summary?period=${period}`);
      if (!res.ok) {
        // 401 ya dispara logout → redirect a /login vía AuthContext.
        setLoadErrorStatus(res.status);
        setSummary(null);
        return;
      }
      setLoadErrorStatus(null);
      setSummary((await res.json()) as DashboardSummary);
    } catch {
      // Red caída: apiFetch limpia sesión y redirige a login.
      setLoadErrorStatus(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = summary?.tasksTotal ?? 0;
  const inProgress = summary?.tasksByStatus.IN_PROGRESS ?? 0;
  const completed = summary?.tasksByStatus.COMPLETED ?? 0;
  const urgent = summary?.urgent ?? 0;
  const overdue = summary?.overdue ?? 0;
  const recentActivity = useMemo(
    () => (summary?.recentActivity ?? []).slice(0, RECENT_ACTIVITY_LIMIT),
    [summary?.recentActivity],
  );

  const statusCounts = useMemo(() => {
    const map = summary?.tasksByStatus ?? {};
    return TASK_STATUS_ORDER.map((status) => ({
      status,
      count: map[status] ?? 0,
    }));
  }, [summary?.tasksByStatus]);

  const trendHint = useMemo(() => {
    if (!summary || summary.trendPercent == null) return undefined;
    const sign = summary.trendPercent >= 0 ? '+' : '';
    return t('dashboard.trendPeriod', {
      value: `${sign}${summary.trendPercent}%`,
      period: t(`dashboard.periodLabel.${summary.period}`),
    });
  }, [summary, t]);

  const completedHint =
    summary && summary.completedLast48h > 0
      ? t('dashboard.completedHint', { count: summary.completedLast48h })
      : undefined;

  const subtitle =
    loadErrorStatus != null
      ? `${t('dashboard.loadErrorPrefix')} (${loadErrorStatus}). ${t('dashboard.loadErrorRetry')}`
      : summary
        ? t('dashboard.subtitleLive')
        : t('dashboard.subtitle');

  const donutSegments = useMemo(() => {
    if (!summary || total === 0) return [];
    return statusCounts
      .filter((s) => s.count > 0)
      .map((s) => ({
        value: s.count,
        color: taskStatusChartColor(s.status),
        label: t(`dashboard.status.${s.status}`),
      }));
  }, [summary, total, statusCounts, t]);

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={subtitle}
        actions={
          <div className="flex w-fit items-center gap-1 rounded-lg border border-outline-variant bg-surface-container p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={[
                  'rounded px-4 py-1.5 text-xs font-bold uppercase transition-colors',
                  period === p
                    ? 'bg-surface-container-highest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                ].join(' ')}
              >
                {t(`dashboard.${p}`)}
              </button>
            ))}
          </div>
        }
      />

      {loading && !summary ? (
        <p className="mb-4 text-sm text-on-surface-variant">{t('common.loading')}</p>
      ) : null}
      {loadErrorStatus != null ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-error" role="alert">
            {t('dashboard.loadErrorPrefix')} ({loadErrorStatus})
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold uppercase text-primary hover:bg-surface-container-high"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard.totalTasks')}
          value={String(total)}
          icon="assignment"
          hint={trendHint}
          hintPositive={summary?.trendPercent != null && summary.trendPercent >= 0}
        />
        <StatCard
          label={t('dashboard.inProgress')}
          value={String(inProgress)}
          icon="pending"
          progress={total > 0 ? Math.round((inProgress / total) * 100) : 0}
        />
        <StatCard
          label={t('dashboard.completed')}
          value={String(completed)}
          icon="check_circle"
          variant="success"
          hint={completedHint}
        />
        <div className="flex flex-col gap-2">
          <StatCard
            label={t('dashboard.urgent')}
            value={String(urgent)}
            icon="priority_high"
            variant="danger"
            hint={
              urgent > 0
                ? overdue > 0
                  ? t('dashboard.urgentHintWithOverdue', { overdue })
                  : t('dashboard.requiresAttention')
                : undefined
            }
          />
          {summary?.urgentTasks && summary.urgentTasks.length > 0 ? (
            <ul className="rounded-xl border border-error/30 bg-surface-container-lowest px-3 py-2 text-xs">
              {summary.urgentTasks.map((task) => (
                <li key={task.id} className="truncate">
                  <Link to={`/tasks/${task.id}`} className="font-semibold text-error hover:underline">
                    {task.title}
                  </Link>
                  <span className="text-on-surface-variant">
                    {' '}
                    — {t(`dashboard.urgentReason.${task.reason}`)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">{t('dashboard.tasksByStatus')}</h2>
              <p className="text-sm text-on-surface-variant">{t('dashboard.orgDataCaption')}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-center">
            <StatusDonut segments={donutSegments} total={total} />
            <DonutLegend segments={donutSegments} statusCounts={statusCounts} total={total} urgent={urgent} />
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 lg:col-span-4">
          <h2 className="text-lg font-semibold text-on-surface">{t('dashboard.recentActivity')}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">{t('dashboard.recentActivityHint')}</p>
          {summary ? (
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {t('dashboard.activeUsers', { count: summary.usersActive })}
            </p>
          ) : null}
          <ul className="mt-4 max-h-[28rem] space-y-4 overflow-y-auto">
            {recentActivity.length ? (
              recentActivity.map((entry) => {
                const userName = entry.user
                  ? `${entry.user.firstName} ${entry.user.lastName}`.trim()
                  : t('taskDetail.system');
                const initials = entry.user
                  ? `${entry.user.firstName?.[0] ?? ''}${entry.user.lastName?.[0] ?? ''}`.toUpperCase()
                  : 'S';
                const { icon, className } = activityIcon(entry.action);
                const taskId = entry.task?.id;
                return (
                  <li key={entry.id} className="flex gap-3">
                    <Avatar initials={initials || '?'} className="h-9 w-9 shrink-0 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-on-surface">
                        <span className="font-semibold">{userName}</span>{' '}
                        <span className="text-on-surface-variant">
                          {activityTimelineMessage(entry, t)}
                        </span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-on-surface-variant">
                        <span className={`material-symbols-outlined text-sm ${className}`}>{icon}</span>
                        {formatRelativeTime(entry.createdAt, locale)}
                      </p>
                      {taskId ? (
                        <Link
                          to={`/tasks/${taskId}`}
                          className="mt-1 inline-block text-[11px] font-bold uppercase text-primary hover:underline"
                        >
                          {t('dashboard.viewTask')}
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-on-surface-variant">{t('dashboard.noActivity')}</li>
            )}
          </ul>
          <Link
            to="/activity"
            className="mt-6 block w-full rounded-lg border border-outline-variant py-2.5 text-center text-xs font-bold uppercase text-on-surface-variant hover:bg-surface-container-high"
          >
            {t('dashboard.viewAllActivity')}
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-on-surface">{t('dashboard.deptWorkloadTitle')}</h2>
        {summary?.departmentWorkload?.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summary.departmentWorkload.map((dept) => (
              <DeptCard key={dept.id} dept={dept} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
            {t('dashboard.noDepartments')}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusDonut({
  segments,
  total,
}: {
  segments: { value: number; color: string; label: string }[];
  total: number;
}) {
  const gradient = useMemo(() => {
    if (total === 0 || segments.length === 0) return null;
    let acc = 0;
    const stops: string[] = [];
    for (const seg of segments) {
      const pct = (seg.value / total) * 100;
      const end = acc + pct;
      stops.push(`${seg.color} ${acc}% ${end}%`);
      acc = end;
    }
    return `conic-gradient(from -90deg, ${stops.join(', ')})`;
  }, [segments, total]);

  return (
    <div className="relative h-44 w-44 shrink-0">
      <div
        className="h-full w-full rounded-full"
        style={{ background: gradient ?? CHART_TRACK }}
        role="img"
        aria-hidden={gradient == null}
      />
      <div className="absolute inset-[18px] flex items-center justify-center rounded-full bg-surface-container-lowest shadow-inner">
        <span className="text-2xl font-bold text-on-surface">{total}</span>
      </div>
    </div>
  );
}

function DonutLegend({
  segments,
  statusCounts,
  total,
  urgent,
}: {
  segments: { value: number; color: string; label: string }[];
  statusCounts: { status: string; count: number }[];
  total: number;
  urgent: number;
}) {
  const { t } = useTranslation();

  const rows =
    segments.length > 0
      ? segments.map((row) => ({ key: row.label, color: row.color, label: row.label, count: row.value }))
      : statusCounts.map((s) => ({
          key: s.status,
          color: taskStatusChartColor(s.status),
          label: t(`dashboard.status.${s.status}`),
          count: s.count,
        }));

  return (
    <ul className="w-full max-w-xs space-y-3">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
        return (
          <li key={row.key} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-on-surface-variant">{row.label}</span>
            </div>
            <span className="font-mono text-on-surface">
              {row.count}
              {total > 0 && row.count > 0 ? (
                <span className="ms-2 text-xs text-on-surface-variant">({pct}%)</span>
              ) : null}
            </span>
          </li>
        );
      })}
      {urgent > 0 ? (
        <li className="flex items-center justify-between gap-4 border-t border-outline-variant/50 pt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-error" />
            <span className="text-on-surface-variant">{t('dashboard.urgent')}</span>
          </div>
          <span className="font-mono text-on-surface">{urgent}</span>
        </li>
      ) : null}
    </ul>
  );
}

function DeptCard({ dept }: { dept: DeptWorkload }) {
  const { t } = useTranslation();
  const loadPct =
    dept.totalTasks > 0 ? Math.min(100, Math.round((dept.openTasks / dept.totalTasks) * 100)) : 0;
  const barColor =
    dept.loadLevel === 'critical'
      ? 'bg-error'
      : dept.loadLevel === 'under'
        ? 'bg-tertiary/60'
        : 'bg-primary';

  const statusLabel =
    dept.loadLevel === 'critical'
      ? t('dashboard.loadCritical')
      : dept.loadLevel === 'under'
        ? t('dashboard.loadUnder')
        : t('dashboard.loadBalanced');

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{dept.name}</p>
      <p className="mt-2 text-2xl font-bold text-on-surface">
        {dept.openTasks}
        <span className="text-base font-normal text-on-surface-variant">/{dept.totalTasks}</span>
      </p>
      <p className="mt-1 text-[11px] text-on-surface-variant">
        {t('dashboard.deptMembers', { count: dept.memberCount })}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-outline-variant/30">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${loadPct}%` }} />
      </div>
      <p className="mt-2 text-[11px] font-semibold text-on-surface-variant">
        {dept.efficiency != null
          ? t('dashboard.efficiency', { value: dept.efficiency })
          : statusLabel}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  variant = 'default',
  hint,
  hintPositive = true,
  progress,
}: {
  label: string;
  value: string;
  icon: string;
  variant?: 'default' | 'success' | 'danger';
  hint?: string;
  hintPositive?: boolean;
  progress?: number;
}) {
  const box =
    variant === 'danger'
      ? 'border-[#ba1a1a]/30 bg-[#ffdad6] shadow-sm'
      : variant === 'success'
        ? 'border-[#006d2e]/25 bg-[#e8f5ec] shadow-sm'
        : 'border-outline-variant bg-surface-container-lowest text-on-surface shadow-sm';
  const iconColor =
    variant === 'danger' ? 'text-error' : variant === 'success' ? 'text-tertiary' : 'text-primary';
  const labelCls =
    variant === 'danger' ? 'text-[#93000a]' : variant === 'success' ? 'text-[#006d2e]' : 'text-on-surface-variant';

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${box}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-wide ${labelCls}`}>{label}</span>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>
      <div
        className={`text-3xl font-bold ${
          variant === 'danger' ? 'text-[#ba1a1a]' : variant === 'success' ? 'text-[#006d2e]' : 'text-on-surface'
        }`}
      >
        {value}
      </div>
      {hint ? (
        <div
          className={`mt-2 flex items-center gap-1 text-[11px] font-bold ${
            variant === 'danger' ? 'text-error' : hintPositive ? 'text-tertiary' : 'text-on-surface-variant'
          }`}
        >
          {variant === 'danger' ? (
            <span className="material-symbols-outlined text-sm">warning</span>
          ) : hintPositive ? (
            <span className="material-symbols-outlined text-sm">trending_up</span>
          ) : (
            <span className="material-symbols-outlined text-sm">trending_down</span>
          )}
          {hint}
        </div>
      ) : null}
      {progress != null ? (
        <div className="mt-4 h-1 w-full rounded-full bg-outline-variant/30">
          <div className="h-1 rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}

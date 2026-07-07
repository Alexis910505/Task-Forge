import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { apiFetch, apiJson } from '@/lib/api';

type WeeklyRow = { label: string; created: number; completed: number; target: number };

type SlaDeptRow = {
  departmentId: string | null;
  departmentName: string;
  successPercent: number;
  doneCount: number;
  lateCount: number;
  tasksTotal: number;
};

type UserRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string | null;
  tasksCompletedInPeriod: number;
  overdueOpen: number;
  avgCompletionHours: number | null;
  slaPercent: number;
};

type DeptVolumeRow = {
  departmentId: string | null;
  departmentName: string;
  tasksTotal: number;
};

type Overview = {
  productivity: {
    period: { from: string; to: string };
    tasksCreatedInPeriod: number;
    tasksCompletedInPeriod: number;
    completionRatePercent: number;
  };
  weeklyOutput: WeeklyRow[];
  slaByDepartment: SlaDeptRow[];
  byDepartment: DeptVolumeRow[];
  byUser: UserRow[];
  summary: {
    tasksInPeriod: number;
    efficiencyDeltaPercent: number | null;
    totalDone: number;
    totalLate: number;
  };
};

type RangePreset = '7d' | '30d' | '90d';

function rangeFromPreset(preset: RangePreset): { from: string; to: string } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (preset === '7d') from.setDate(from.getDate() - 7);
  else if (preset === '30d') from.setDate(from.getDate() - 30);
  else from.setDate(from.getDate() - 90);
  return { from: from.toISOString(), to: to.toISOString() };
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function formatRangeLabel(fromIso: string, toIso: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale.startsWith('es') ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${fmt.format(new Date(fromIso))} – ${fmt.format(new Date(toIso))}`;
}

function formatCompact(n: number, locale: string): string {
  return new Intl.NumberFormat(locale.startsWith('es') ? 'es-ES' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

function userInitials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

function shortName(first: string, last: string): string {
  const ln = last?.[0] ? `${last[0]}.` : '';
  return `${first} ${ln}`.trim();
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language ?? 'es';
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [from, setFrom] = useState(() => rangeFromPreset('30d').from);
  const [to, setTo] = useState(() => rangeFromPreset('30d').to);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    const r = rangeFromPreset(p);
    setFrom(r.from);
    setTo(r.to);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ from, to });
    const res = await apiJson<Overview>(`/reports/overview?${qs}`);
    setLoading(false);
    if (!res.ok) {
      setError(t('common.loadError', { status: res.status }));
      setData(null);
      return;
    }
    setError(null);
    setData(res.data ?? null);
  }, [from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(kind: 'pdf' | 'xlsx') {
    const qs = new URLSearchParams({ from, to });
    const path = kind === 'pdf' ? `/reports/export/pdf?${qs}` : `/reports/export/xlsx?${qs}`;
    const res = await apiFetch(path);
    if (!res.ok) {
      setError(t('common.loadError', { status: res.status }));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = kind === 'pdf' ? 'taskforge-report.pdf' : 'taskforge-report.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  const deptVolumes = useMemo(() => {
    const rows = data?.byDepartment ?? [];
    const total = rows.reduce((s, d) => s + d.tasksTotal, 0) || 1;
    return [...rows]
      .sort((a, b) => b.tasksTotal - a.tasksTotal)
      .map((d) => ({
        ...d,
        percent: Math.round((d.tasksTotal / total) * 100),
      }));
  }, [data?.byDepartment]);

  const efficiencyBadge = data?.summary.efficiencyDeltaPercent;
  const efficiencyLabel =
    efficiencyBadge != null
      ? efficiencyBadge >= 0
        ? t('reports.efficiencyUp', { value: Math.abs(efficiencyBadge) })
        : t('reports.efficiencyDown', { value: Math.abs(efficiencyBadge) })
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
            <span className="material-symbols-outlined text-outline">calendar_today</span>
            <input
              type="date"
              value={toDateInputValue(from)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                d.setHours(0, 0, 0, 0);
                setFrom(d.toISOString());
              }}
              className="border-0 bg-transparent text-xs font-bold text-on-surface-variant outline-none"
            />
            <span className="text-on-surface-variant">–</span>
            <input
              type="date"
              value={toDateInputValue(to)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                d.setHours(23, 59, 59, 999);
                setTo(d.toISOString());
              }}
              className="border-0 bg-transparent text-xs font-bold text-on-surface-variant outline-none"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-surface-container-low p-1">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={[
                  'rounded px-3 py-1.5 text-xs font-bold uppercase',
                  preset === p
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high',
                ].join(' ')}
              >
                {t(`reports.preset.${p}`)}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void download('xlsx')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary hover:opacity-90"
        >
          <span className="material-symbols-outlined text-xl">file_download</span>
          {t('reports.exportReport')}
        </button>
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
            {t('reports.performanceTitle')}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t('reports.performanceSubtitle')}</p>
          {data ? (
            <p className="mt-1 text-xs text-on-surface-variant/80">
              {formatRangeLabel(data.productivity.period.from, data.productivity.period.to, locale)}
            </p>
          ) : null}
        </div>
        {data ? (
          <div className="flex flex-wrap gap-2">
            {efficiencyLabel ? (
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold uppercase',
                  (efficiencyBadge ?? 0) >= 0
                    ? 'border-tertiary/20 bg-tertiary-container/10 text-tertiary'
                    : 'border-error-container bg-error-container/30 text-on-error-container',
                ].join(' ')}
              >
                <span className="material-symbols-outlined text-sm">
                  {(efficiencyBadge ?? 0) >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {efficiencyLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-container/10 px-3 py-1 text-xs font-bold uppercase text-primary">
              <span className="material-symbols-outlined text-sm">task_alt</span>
              {t('reports.tasksBadge', { count: data.summary.tasksInPeriod })}
            </span>
          </div>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}

      {data ? (
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-on-surface">{t('reports.productivityTitle')}</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
                  {t('reports.productivitySubtitle')}
                </p>
              </div>
              <div className="flex gap-4 text-xs font-bold uppercase">
                <span className="flex items-center gap-1 text-primary">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                  {t('reports.legendCurrent')}
                </span>
                <span className="flex items-center gap-1 text-outline">
                  <span className="h-3 w-3 rounded-full bg-outline" />
                  {t('reports.legendTarget')}
                </span>
              </div>
            </div>
            <ProductivityChart weeks={data.weeklyOutput} />
          </section>

          <section className="col-span-12 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-4">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-on-surface">{t('reports.slaTitle')}</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
                {t('reports.slaSubtitle')}
              </p>
            </div>
            {data.slaByDepartment.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t('reports.noDeptData')}</p>
            ) : (
              <div className="space-y-6">
                {data.slaByDepartment.slice(0, 6).map((d) => (
                  <div key={d.departmentId ?? d.departmentName} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-on-surface">
                      <span className="truncate pe-2">{d.departmentName}</span>
                      <span className="shrink-0">
                        {d.successPercent}% {t('reports.successSuffix')}
                      </span>
                    </div>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, d.successPercent)}%` }}
                      />
                      <div
                        className="h-full bg-error"
                        style={{ width: `${Math.max(0, 100 - d.successPercent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 flex justify-around border-t border-outline-variant pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCompact(data.summary.totalDone, locale)}
                </p>
                <p className="text-xs font-bold uppercase text-on-surface-variant">{t('reports.done')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-error">
                  {formatCompact(data.summary.totalLate, locale)}
                </p>
                <p className="text-xs font-bold uppercase text-on-surface-variant">{t('reports.late')}</p>
              </div>
            </div>
          </section>

          <section className="col-span-12 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-on-surface">{t('reports.tasksByDept')}</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
                  {t('reports.volumeDist')}
                </p>
              </div>
              <span className="material-symbols-outlined text-outline" title={t('reports.volumeHint')}>
                info
              </span>
            </div>
            {deptVolumes.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t('reports.noDeptData')}</p>
            ) : (
              <DeptTreemap items={deptVolumes} />
            )}
          </section>

          <section className="col-span-12 flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest lg:col-span-7">
            <div className="border-b border-outline-variant p-6">
              <h2 className="text-lg font-semibold text-on-surface">{t('reports.techPerf')}</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
                {t('reports.techPerfSubtitle')}
              </p>
            </div>
            <div className="overflow-x-auto">
              {data.byUser.length === 0 ? (
                <p className="p-6 text-sm text-on-surface-variant">{t('reports.noUserData')}</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('reports.technician')}
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('reports.department')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('reports.tasks')}
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('reports.avgTime')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        {t('reports.slaCol')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {data.byUser.map((u) => (
                      <tr key={u.userId} className="transition-colors hover:bg-surface-container-low">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              initials={userInitials(u.firstName, u.lastName)}
                              className="h-8 w-8 text-xs"
                            />
                            <span className="font-bold text-on-surface">
                              {shortName(u.firstName, u.lastName)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          {u.departmentName ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-on-surface">
                          {u.tasksCompletedInPeriod}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-on-surface">
                          {u.avgCompletionHours != null ? `${u.avgCompletionHours}h` : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <SlaBadge percent={u.slaPercent} />
                        </td>
                      </tr>
                    ))}
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

function ProductivityChart({ weeks }: { weeks: WeeklyRow[] }) {
  const width = 800;
  const height = 300;
  const pad = 40;

  const current = weeks.map((w) => w.completed);
  const target = weeks.map((w) => w.target);
  const max = Math.max(...current, ...target, 1);

  const toPoints = (values: number[]) =>
    values.map((v, i) => {
      const x = pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2);
      const y = pad + (1 - v / max) * (height - pad * 2);
      return { x, y };
    });

  const currentPts = toPoints(current);
  const targetPts = toPoints(target);

  const linePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

  const areaPath =
    currentPts.length > 0
      ? `${linePath(currentPts)} L${currentPts[currentPts.length - 1].x} ${height} L${currentPts[0].x} ${height} Z`
      : '';

  return (
    <div>
      <div className="relative h-[300px] border-b border-l border-outline-variant/30 pl-4 pb-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="reportsArea" x1="0" x2="0" y1="0" y2="1">
              <stop stopColor="#4744e5" />
              <stop offset="1" stopColor="#4744e5" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={pad}
              x2={width}
              y1={pad + ((height - pad * 2) / 4) * i}
              y2={pad + ((height - pad * 2) / 4) * i}
              stroke="currentColor"
              className="text-on-surface/10"
            />
          ))}
          {areaPath ? <path d={areaPath} fill="url(#reportsArea)" fillOpacity={0.15} /> : null}
          <path
            d={linePath(targetPts)}
            fill="none"
            stroke="#767587"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
          <path
            d={linePath(currentPts)}
            fill="none"
            stroke="#4744e5"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {currentPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#4744e5" />
          ))}
        </svg>
      </div>
      <div className="mt-4 flex justify-between px-4 text-xs font-bold uppercase text-on-surface-variant">
        {weeks.map((w) => (
          <span key={w.label}>{w.label}</span>
        ))}
      </div>
    </div>
  );
}

function DeptTreemap({
  items,
}: {
  items: { departmentName: string; percent: number; tasksTotal: number }[];
}) {
  const [a, b, c, ...rest] = items;
  const restPct = rest.reduce((s, x) => s + x.percent, 0);

  return (
    <div className="grid h-[350px] grid-cols-6 grid-rows-4 gap-2">
      {a ? (
        <div className="col-span-4 row-span-4 flex flex-col justify-end rounded-lg border border-primary/30 bg-primary/20 p-4 transition-colors hover:bg-primary/30">
          <span className="text-4xl font-bold text-primary/30">{a.percent}%</span>
          <span className="font-semibold text-on-surface">{a.departmentName}</span>
        </div>
      ) : null}
      {b ? (
        <div className="col-span-2 row-span-2 flex flex-col justify-end rounded-lg border border-outline-variant bg-secondary-container p-3">
          <span className="text-xl font-semibold text-secondary">{b.percent}%</span>
          <span className="text-xs font-bold text-on-secondary-container">{b.departmentName}</span>
        </div>
      ) : null}
      {c ? (
        <div className="col-span-2 row-span-1 flex flex-col justify-end rounded-lg border border-tertiary/20 bg-tertiary-container/20 p-2">
          <span className="text-xs font-bold text-tertiary-container">
            {c.percent}% {c.departmentName}
          </span>
        </div>
      ) : null}
      {rest.slice(0, 2).map((d, i) => (
        <div
          key={d.departmentName}
          className={[
            'col-span-1 row-span-1 flex flex-col justify-end rounded-lg border border-outline-variant p-1',
            i === 0 ? 'bg-surface-container-highest' : 'bg-surface-container-high',
          ].join(' ')}
        >
          <span className="text-[10px] font-bold text-on-surface-variant">{d.percent}%</span>
        </div>
      ))}
      {restPct > 0 && rest.length > 2 ? (
        <div className="col-span-2 row-span-1 flex items-end rounded-lg border border-outline-variant bg-surface-container-low p-2">
          <span className="text-[10px] font-bold text-on-surface-variant">+{restPct}%</span>
        </div>
      ) : null}
    </div>
  );
}

function SlaBadge({ percent }: { percent: number }) {
  const high = percent >= 95;
  return (
    <span
      className={[
        'inline-block rounded border px-2 py-0.5 text-[10px] font-black',
        high
          ? 'border-tertiary/20 bg-tertiary-container/10 text-tertiary'
          : 'border-outline-variant bg-secondary-container/30 text-secondary',
      ].join(' ')}
    >
      {percent}%
    </span>
  );
}

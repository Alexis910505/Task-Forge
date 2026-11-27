import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { apiJson } from '@/lib/api';
import { todayLocalDateString } from '@/lib/dueDates';
import { userHasPermission } from '@/lib/rolePermissions';
import { RoutineFormModal, type RoutineForm } from '@/components/routines/RoutineFormModal';
import { RoutineStatsModal } from '@/components/routines/RoutineStatsModal';
import { ProgressRing, RoutineHistoryStrip, WeekdayChips } from '@/components/routines/RoutineBits';

export type RoutineUser = { id: string; firstName: string; lastName: string; email: string };
export type DayStatus = 'done' | 'partial' | 'missed' | 'pending' | 'off';

type TodayRoutine = {
  id: string;
  name: string;
  description?: string | null;
  personal: boolean;
  weekdays: number[];
  items: { id: string; title: string; checked: boolean }[];
  done: number;
  total: number;
  completed: boolean;
  streak: number;
  completionRate: number | null;
  history: { date: string; status: DayStatus }[];
};

export type ManagedRoutine = {
  id: string;
  name: string;
  description?: string | null;
  personal: boolean;
  weekdays: number[];
  items: { id: string; title: string }[];
  assignees: RoutineUser[];
  owner: RoutineUser;
  canEdit: boolean;
};

export function RoutinesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canShare = userHasPermission(user, 'tasks:assign');
  const [date] = useState(todayLocalDateString);
  const [today, setToday] = useState<TodayRoutine[]>([]);
  const [all, setAll] = useState<ManagedRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedRoutine | 'new' | null>(null);
  const [statsFor, setStatsFor] = useState<ManagedRoutine | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tRes, aRes] = await Promise.all([
      apiJson<TodayRoutine[]>(`/routines/today?date=${date}`),
      apiJson<ManagedRoutine[]>('/routines'),
    ]);
    setLoading(false);
    if (!tRes.ok || !aRes.ok) {
      setError(t('common.loadError', { status: tRes.ok ? aRes.status : tRes.status }));
      return;
    }
    setError(null);
    setToday(tRes.data ?? []);
    setAll(aRes.data ?? []);
  }, [date, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(routine: TodayRoutine, itemId: string, checked: boolean) {
    setBusyItem(itemId);
    // Cambio inmediato en pantalla; se corrige con la respuesta del servidor.
    setToday((list) =>
      list.map((r) =>
        r.id !== routine.id
          ? r
          : {
              ...r,
              items: r.items.map((i) => (i.id === itemId ? { ...i, checked } : i)),
              done: r.done + (checked ? 1 : -1),
            },
      ),
    );
    const res = await apiJson<TodayRoutine>(`/routines/${routine.id}/check`, {
      method: 'POST',
      body: JSON.stringify({ date, itemId, checked }),
    });
    setBusyItem(null);
    if (res.ok && res.data) {
      const fresh = res.data;
      setToday((list) => list.map((r) => (r.id === fresh.id ? fresh : r)));
    } else {
      setError(t('routines.checkFailed'));
      void load();
    }
  }

  async function save(form: RoutineForm, id?: string) {
    const body = JSON.stringify({
      name: form.name,
      description: form.description,
      weekdays: form.weekdays,
      items: form.items.map((i) => ({ ...(i.id ? { id: i.id } : {}), title: i.title })),
      ...(id ? {} : { personal: form.personal }),
      ...(form.personal ? {} : { assigneeIds: form.assigneeIds }),
    });
    const res = await apiJson(id ? `/routines/${id}` : '/routines', { method: id ? 'PATCH' : 'POST', body });
    if (!res.ok) {
      const msg = (res.data as { message?: string | string[] } | undefined)?.message;
      return Array.isArray(msg) ? msg.join(', ') : msg || t('common.loadError', { status: res.status });
    }
    setEditing(null);
    await load();
    return null;
  }

  async function archive(r: ManagedRoutine) {
    if (!window.confirm(t('routines.archiveConfirm', { name: r.name }))) return;
    const res = await apiJson(`/routines/${r.id}`, { method: 'DELETE' });
    if (!res.ok) setError(t('common.loadError', { status: res.status }));
    await load();
  }

  const doneCount = today.filter((r) => r.completed).length;
  const stepsDone = useMemo(() => today.reduce((n, r) => n + r.done, 0), [today]);
  const stepsTotal = useMemo(() => today.reduce((n, r) => n + r.total, 0), [today]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{t('routines.title')}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t('routines.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {t('routines.new')}
        </button>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}

      {!loading ? (
        <section className="mb-10">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t('routines.today')}
            </h2>
            {today.length ? (
              <p className="text-xs font-semibold text-on-surface-variant">
                {t('routines.todaySummary', { done: doneCount, total: today.length, steps: stepsDone, stepsTotal })}
              </p>
            ) : null}
          </div>

          {today.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">
              {t('routines.noneToday')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {today.map((r) => (
                <article
                  key={r.id}
                  className={[
                    'rounded-xl border bg-surface-container-lowest p-5 shadow-sm transition-colors',
                    r.completed ? 'border-tertiary/50' : 'border-outline-variant',
                  ].join(' ')}
                >
                  <header className="flex items-start gap-4">
                    <ProgressRing done={r.done} total={r.total} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-on-surface">{r.name}</h3>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {r.personal ? t('routines.personal') : t('routines.shared')}
                        {r.completed ? ` · ${t('routines.completedToday')}` : ''}
                      </p>
                      {r.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{r.description}</p>
                      ) : null}
                    </div>
                  </header>

                  <ul className="mt-4 space-y-1">
                    {r.items.map((i) => (
                      <li key={i.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-container-low">
                          <input
                            type="checkbox"
                            checked={i.checked}
                            disabled={busyItem === i.id}
                            onChange={(e) => void toggle(r, i.id, e.target.checked)}
                            className="h-5 w-5 shrink-0 accent-primary"
                          />
                          <span
                            className={[
                              'text-sm',
                              i.checked ? 'text-on-surface-variant line-through' : 'text-on-surface',
                            ].join(' ')}
                          >
                            {i.title}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60 pt-4">
                    <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
                      <span className="flex items-center gap-1" title={t('routines.streakHint')}>
                        <span className="material-symbols-outlined text-base text-primary">local_fire_department</span>
                        {t('routines.streak', { count: r.streak })}
                      </span>
                      <span title={t('routines.rateHint')}>
                        {r.completionRate == null ? '—' : `${r.completionRate}%`} {t('routines.last30')}
                      </span>
                    </div>
                    <RoutineHistoryStrip history={r.history} />
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!loading ? (
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            {t('routines.all')}
          </h2>
          {all.length === 0 ? (
            <p className="text-sm text-on-surface-variant">{t('routines.noneAll')}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">{t('routines.colName')}</th>
                    <th className="hidden px-4 py-3 md:table-cell">{t('routines.colDays')}</th>
                    <th className="hidden px-4 py-3 sm:table-cell">{t('routines.colSteps')}</th>
                    <th className="hidden px-4 py-3 lg:table-cell">{t('routines.colWho')}</th>
                    <th className="px-4 py-3 text-right">
                      <span className="sr-only">{t('routines.colActions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {all.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-on-surface">{r.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {r.personal ? t('routines.personal') : t('routines.shared')}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <WeekdayChips weekdays={r.weekdays} />
                      </td>
                      <td className="hidden px-4 py-3 text-on-surface-variant sm:table-cell">{r.items.length}</td>
                      <td className="hidden px-4 py-3 text-xs text-on-surface-variant lg:table-cell">
                        {r.personal
                          ? t('routines.onlyMe')
                          : r.assignees.length
                            ? r.assignees.map((a) => `${a.firstName} ${a.lastName}`.trim() || a.email).join(', ')
                            : t('routines.everyone')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconButton icon="insights" label={t('routines.viewStats')} onClick={() => setStatsFor(r)} />
                          {r.canEdit ? (
                            <>
                              <IconButton icon="edit" label={t('routines.edit')} onClick={() => setEditing(r)} />
                              <IconButton icon="archive" label={t('routines.archive')} onClick={() => void archive(r)} />
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {editing ? (
        <RoutineFormModal
          routine={editing === 'new' ? null : editing}
          canShare={canShare}
          onClose={() => setEditing(null)}
          onSave={(form) => save(form, editing === 'new' ? undefined : editing.id)}
        />
      ) : null}
      {statsFor ? <RoutineStatsModal routine={statsFor} date={date} onClose={() => setStatsFor(null)} /> : null}
    </div>
  );
}

function IconButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </button>
  );
}

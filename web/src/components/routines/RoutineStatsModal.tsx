import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiJson } from '@/lib/api';
import type { DayStatus, ManagedRoutine, RoutineUser } from '@/pages/RoutinesPage';
import { RoutineHistoryStrip } from './RoutineBits';

type PersonStats = {
  user: RoutineUser;
  streak: number;
  completionRate: number | null;
  scheduledDays: number;
  completedDays: number;
  lastCompletedDate: string | null;
  history: { date: string; status: DayStatus }[];
};

/** Cumplimiento por persona: quién la hizo, racha y % de los últimos 30 días. */
export function RoutineStatsModal({ routine, date, onClose }: { routine: ManagedRoutine; date: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [people, setPeople] = useState<PersonStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiJson<{ people: PersonStats[] }>(`/routines/${routine.id}/stats?date=${date}`).then((res) => {
      if (res.ok && res.data) setPeople(res.data.people);
      else setError(t('common.loadError', { status: res.status }));
    });
  }, [routine.id, date, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fmt = (d: string | null) =>
    d ? new Date(`${d}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) : '—';
  const sorted = people ? [...people].sort((a, b) => (b.completionRate ?? -1) - (a.completionRate ?? -1)) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-stats-title"
        className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-t-2xl bg-surface-container-lowest shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant p-5">
          <div>
            <h2 id="routine-stats-title" className="text-lg font-semibold text-on-surface">
              {routine.name}
            </h2>
            <p className="text-xs text-on-surface-variant">{t('routines.stats.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('routines.form.close')} className="rounded-lg p-1 hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5">
          {error ? <p className="text-sm text-error">{error}</p> : null}
          {!people && !error ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
          {people ? (
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="pb-2">{t('routines.stats.person')}</th>
                  <th className="pb-2 text-right">{t('routines.stats.rate')}</th>
                  <th className="hidden pb-2 text-right sm:table-cell">{t('routines.stats.streak')}</th>
                  <th className="hidden pb-2 text-right sm:table-cell">{t('routines.stats.last')}</th>
                  <th className="hidden pb-2 ps-4 md:table-cell">{t('routines.stats.history')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {sorted.map((p) => (
                  <tr key={p.user.id}>
                    <td className="py-2.5 font-semibold text-on-surface">
                      {`${p.user.firstName} ${p.user.lastName}`.trim() || p.user.email}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="font-bold text-on-surface">{p.completionRate == null ? '—' : `${p.completionRate}%`}</span>
                      <span className="ms-1 text-xs text-on-surface-variant">
                        ({p.completedDays}/{p.scheduledDays})
                      </span>
                    </td>
                    <td className="hidden py-2.5 text-right text-on-surface-variant sm:table-cell">{p.streak}</td>
                    <td className="hidden py-2.5 text-right text-on-surface-variant sm:table-cell">{fmt(p.lastCompletedDate)}</td>
                    <td className="hidden py-2.5 ps-4 md:table-cell">
                      <RoutineHistoryStrip history={p.history} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <p className="mt-4 text-[11px] text-on-surface-variant">{t('routines.stats.legend')}</p>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskStatusPillClass } from '@/lib/taskStatusColors';

export type RecurrenceOccurrence = {
  id: string;
  occurrence: number;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  assignee?: { id: string; firstName: string; lastName: string; email: string } | null;
};

export type RecurrenceSeries = {
  seriesId: string;
  total: number;
  completed: number;
  lastCompletedAt?: string | null;
  occurrences: RecurrenceOccurrence[];
};

type Props = {
  taskId: string;
  recurrence?: string | null;
  occurrence?: number;
  status: string;
  nextOccurrenceAt?: string | null;
  spawnedNextId?: string | null;
  series?: RecurrenceSeries | null;
};

function formatDate(iso: string | null | undefined, locale: string, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Tarjeta de repetición: intervalo, próxima ocurrencia, estadística e historial de la serie. */
export function RecurrencePanel({
  taskId,
  recurrence,
  occurrence,
  status,
  nextOccurrenceAt,
  spawnedNextId,
  series,
}: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('es') ? 'es' : 'en';
  if (!recurrence && !series) return null;

  let nextLine: string;
  if (spawnedNextId) nextLine = t('recurrencePanel.nextCreated');
  else if (!recurrence) nextLine = t('recurrencePanel.stopped');
  else if (nextOccurrenceAt) nextLine = t('recurrencePanel.nextAt', { date: formatDate(nextOccurrenceAt, locale, true) });
  else if (status === 'COMPLETED') nextLine = t('recurrencePanel.stopped');
  else nextLine = t('recurrencePanel.nextAfterComplete');

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        <span className="material-symbols-outlined text-base text-primary">repeat</span>
        {t('recurrencePanel.title')}
      </h2>
      <p className="text-sm font-bold text-on-surface">
        {recurrence ? t(`recurrence.${recurrence}`) : t('recurrence.NONE')}
        {occurrence ? (
          <span className="ms-2 text-xs font-semibold text-on-surface-variant">
            {t('recurrencePanel.occurrence', { n: occurrence })}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">{nextLine}</p>

      {series ? (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-container-low p-3">
              <dt className="text-[10px] font-bold uppercase text-on-surface-variant">{t('recurrencePanel.done')}</dt>
              <dd className="text-xl font-bold text-on-surface">{series.completed}</dd>
            </div>
            <div className="rounded-lg bg-surface-container-low p-3">
              <dt className="text-[10px] font-bold uppercase text-on-surface-variant">{t('recurrencePanel.created')}</dt>
              <dd className="text-xl font-bold text-on-surface">{series.total}</dd>
            </div>
            <div className="rounded-lg bg-surface-container-low p-3">
              <dt className="text-[10px] font-bold uppercase text-on-surface-variant">{t('recurrencePanel.last')}</dt>
              <dd className="mt-1 text-xs font-bold text-on-surface">{formatDate(series.lastCompletedAt, locale)}</dd>
            </div>
          </dl>

          <h3 className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {t('recurrencePanel.history')}
          </h3>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {series.occurrences.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/tasks/${o.id}`}
                  className={[
                    'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs',
                    o.id === taskId ? 'bg-primary/10' : 'hover:bg-surface-container-low',
                  ].join(' ')}
                >
                  <span className="font-bold text-on-surface">#{o.occurrence}</span>
                  <span className="flex-1 truncate text-on-surface-variant">
                    {o.completedAt
                      ? t('recurrencePanel.completedOn', { date: formatDate(o.completedAt, locale) })
                      : t('recurrencePanel.createdOn', { date: formatDate(o.createdAt, locale) })}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${taskStatusPillClass(o.status)}`}>
                    {t(`dashboard.status.${o.status}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

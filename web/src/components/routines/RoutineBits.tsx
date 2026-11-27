import { useTranslation } from 'react-i18next';
import type { DayStatus } from '@/pages/RoutinesPage';

/** Lunes primero (ISO 1–7). */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Anillo de progreso de los pasos del día. */
export function ProgressRing({ done, total, size = 56 }: { done: number; total: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  const complete = total > 0 && done >= total;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6" className="stroke-surface-container-high" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={complete ? 'stroke-tertiary' : 'stroke-primary'}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-on-surface">
        {complete ? <span className="material-symbols-outlined text-xl text-tertiary">check</span> : `${done}/${total}`}
      </span>
    </div>
  );
}

const STATUS_CLASS: Record<DayStatus, string> = {
  done: 'bg-tertiary',
  partial: 'bg-tertiary/40',
  missed: 'bg-error/50',
  pending: 'bg-surface-container-highest ring-1 ring-primary',
  off: 'bg-surface-container-high/60',
};

/** Últimas 4 semanas, un cuadro por día (estilo calendario de contribuciones). */
export function RoutineHistoryStrip({ history }: { history: { date: string; status: DayStatus }[] }) {
  const { t, i18n } = useTranslation();
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <div className="flex gap-[3px]" role="img" aria-label={t('routines.historyLabel')}>
      {history.map((h) => (
        <span
          key={h.date}
          title={`${fmt(h.date)}: ${t(`routines.status.${h.status}`)}`}
          className={`h-3 w-2 rounded-[2px] ${STATUS_CLASS[h.status]}`}
        />
      ))}
    </div>
  );
}

export function WeekdayChips({ weekdays }: { weekdays: number[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1">
      {WEEKDAYS.map((d) => (
        <span
          key={d}
          title={t(`routines.weekdayLong.${d}`)}
          className={[
            'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
            weekdays.includes(d) ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant/60',
          ].join(' ')}
        >
          {t(`routines.weekdayShort.${d}`)}
        </span>
      ))}
    </div>
  );
}

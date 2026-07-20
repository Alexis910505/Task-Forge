import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type SubtaskItem = {
  id: string;
  title: string;
  status: string;
};

export type SubtaskProgress = {
  total: number;
  completed: number;
  percent: number;
};

type SubtasksPanelProps = {
  subtasks: SubtaskItem[];
  progress: SubtaskProgress;
  canEdit: boolean;
  subtaskTitle: string;
  subtaskSubmitting: boolean;
  subtaskError: string | null;
  subtaskUpdatingId: string | null;
  onTitleChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleStatus: (subtask: SubtaskItem) => void;
};

export function SubtasksPanel({
  subtasks,
  progress,
  canEdit,
  subtaskTitle,
  subtaskSubmitting,
  subtaskError,
  subtaskUpdatingId,
  onTitleChange,
  onSubmit,
  onToggleStatus,
}: SubtasksPanelProps) {
  const { t } = useTranslation();

  return (
    <section
      id="subtasks"
      className="scroll-mt-6 overflow-hidden rounded-xl border-2 border-primary/25 bg-surface-container-lowest shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-primary-container/15 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
            <span className="material-symbols-outlined">checklist</span>
          </span>
          <div>
            <h2 className="text-base font-semibold text-on-surface">{t('taskDetail.subtasks')}</h2>
            <p className="text-sm text-on-surface-variant">{t('taskDetail.subtasksHint')}</p>
          </div>
        </div>
        {progress.total > 0 ? (
          <div className="text-end">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {t('taskDetail.subtasksProgress', {
                completed: progress.completed,
                total: progress.total,
              })}
            </p>
            <p className="text-lg font-bold text-primary">{progress.percent}%</p>
          </div>
        ) : null}
      </header>

      <div className="space-y-4 p-6">
        {progress.total > 0 ? (
          <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        ) : null}

        {subtasks.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t('taskDetail.noSubtasks')}</p>
        ) : (
          <ul className="space-y-2">
            {subtasks.map((sub) => {
              const done = sub.status === 'COMPLETED';
              return (
                <li
                  key={sub.id}
                  className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2"
                >
                  {canEdit ? (
                    <button
                      type="button"
                      disabled={subtaskUpdatingId === sub.id}
                      onClick={() => onToggleStatus(sub)}
                      className={[
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                        done
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface hover:border-primary',
                      ].join(' ')}
                      title={done ? t('taskDetail.markSubtaskOpen') : t('taskDetail.markSubtaskDone')}
                    >
                      <span className="material-symbols-outlined text-base">
                        {done ? 'check' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  ) : (
                    <span
                      className={[
                        'material-symbols-outlined text-xl',
                        done ? 'text-primary' : 'text-on-surface-variant',
                      ].join(' ')}
                    >
                      {done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  )}
                  <Link
                    to={`/tasks/${sub.id}`}
                    className={[
                      'min-w-0 flex-1 text-sm font-medium hover:text-primary',
                      done ? 'text-on-surface-variant line-through' : 'text-on-surface',
                    ].join(' ')}
                  >
                    {sub.title}
                  </Link>
                  <span
                    className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                      done
                        ? 'bg-tertiary-container/30 text-tertiary'
                        : 'bg-surface-container-high text-on-surface-variant',
                    ].join(' ')}
                  >
                    {done ? t('taskDetail.subtaskDone') : t('taskDetail.subtaskTodo')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {canEdit ? (
          <form
            onSubmit={onSubmit}
            className="rounded-xl border border-dashed border-primary/40 bg-primary-container/5 p-4"
          >
            <label htmlFor="subtask-title" className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t('taskDetail.addSubtask')}
            </label>
            {subtaskError ? <p className="mb-2 text-sm text-error">{subtaskError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <input
                id="subtask-title"
                value={subtaskTitle}
                onChange={(ev) => onTitleChange(ev.target.value)}
                placeholder={t('taskDetail.subtaskTitlePlaceholder')}
                className="min-w-[200px] flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2"
              />
              <button
                type="submit"
                disabled={subtaskSubmitting || !subtaskTitle.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-on-primary disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">add</span>
                {t('taskDetail.addSubtask')}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('taskDetail.subtasksReadonly')}</p>
        )}
      </div>
    </section>
  );
}

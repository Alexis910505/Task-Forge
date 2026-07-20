import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type DraftSubtask = {
  id: string;
  title: string;
};

type DraftSubtasksEditorProps = {
  items: DraftSubtask[];
  onChange: (items: DraftSubtask[]) => void;
  disabled?: boolean;
};

function newDraftSubtask(title: string): DraftSubtask {
  return { id: crypto.randomUUID(), title };
}

export function DraftSubtasksEditor({ items, onChange, disabled }: DraftSubtasksEditorProps) {
  const { t } = useTranslation();
  const [draftTitle, setDraftTitle] = useState('');

  function addItem() {
    const title = draftTitle.trim();
    if (!title || disabled) return;
    onChange([...items, newDraftSubtask(title)]);
    setDraftTitle('');
  }

  function removeItem(id: string) {
    if (disabled) return;
    onChange(items.filter((item) => item.id !== id));
  }

  return (
    <section className="overflow-hidden rounded-xl border-2 border-primary/20 bg-surface-container-low/40">
      <header className="flex items-center gap-3 border-b border-outline-variant bg-primary-container/10 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
          <span className="material-symbols-outlined text-xl">checklist</span>
        </span>
        <div>
          <h3 className="text-sm font-semibold text-on-surface">{t('createTask.subtasks')}</h3>
          <p className="text-xs text-on-surface-variant">{t('createTask.subtasksHint')}</p>
        </div>
      </header>

      <div className="space-y-4 p-5">
        {items.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t('createTask.subtasksEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-on-surface">{item.title}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeItem(item.id)}
                  className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-error-container/30 hover:text-error disabled:opacity-40"
                  title={t('createTask.removeSubtask')}
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={draftTitle}
            disabled={disabled}
            onChange={(ev) => setDraftTitle(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                addItem();
              }
            }}
            placeholder={t('createTask.subtaskPlaceholder')}
            className="min-w-[200px] flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled || !draftTitle.trim()}
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-container/25 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-primary disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">add</span>
            {t('createTask.addSubtask')}
          </button>
        </div>
      </div>
    </section>
  );
}

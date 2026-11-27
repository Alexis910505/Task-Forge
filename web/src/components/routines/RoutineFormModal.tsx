import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiJson } from '@/lib/api';
import type { ManagedRoutine, RoutineUser } from '@/pages/RoutinesPage';
import { WEEKDAYS } from './RoutineBits';

export type RoutineForm = {
  name: string;
  description: string;
  personal: boolean;
  weekdays: number[];
  items: { id?: string; key: string; title: string }[];
  assigneeIds: string[];
};

type Props = {
  routine: ManagedRoutine | null;
  canShare: boolean;
  onClose: () => void;
  /** Devuelve un mensaje de error, o null si se guardó. */
  onSave: (form: RoutineForm) => Promise<string | null>;
};

const WORKDAYS = [1, 2, 3, 4, 5];

export function RoutineFormModal({ routine, canShare, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<RoutineForm>(() => ({
    name: routine?.name ?? '',
    description: routine?.description ?? '',
    personal: routine ? routine.personal : !canShare,
    weekdays: routine?.weekdays ?? WORKDAYS,
    items: routine?.items.map((i) => ({ id: i.id, key: i.id, title: i.title })) ?? [],
    assigneeIds: routine?.assignees.map((a) => a.id) ?? [],
  }));
  const [newItem, setNewItem] = useState('');
  const [users, setUsers] = useState<RoutineUser[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form.personal) return;
    void apiJson<(RoutineUser & { isActive?: boolean })[]>('/users').then((res) => {
      if (res.ok && res.data) setUsers(res.data.filter((u) => u.isActive !== false));
    });
  }, [form.personal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return q
      ? users.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
      : users;
  }, [users, userQuery]);

  const set = <K extends keyof RoutineForm>(k: K, v: RoutineForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  function addItem() {
    const title = newItem.trim();
    if (!title) return;
    set('items', [...form.items, { key: crypto.randomUUID(), title }]);
    setNewItem('');
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const next = [...form.items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    set('items', next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pending = newItem.trim();
    const items = pending ? [...form.items, { key: 'pending', title: pending }] : form.items;
    if (!form.name.trim()) return setError(t('routines.form.errName'));
    if (form.weekdays.length === 0) return setError(t('routines.form.errDays'));
    if (items.filter((i) => i.title.trim()).length === 0) return setError(t('routines.form.errItems'));
    setSaving(true);
    setError(null);
    const err = await onSave({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      items: items.filter((i) => i.title.trim()),
    });
    setSaving(false);
    if (err) setError(err);
  }

  const label = 'mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant';
  const input =
    'w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form
        onSubmit={(e) => void submit(e)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-form-title"
        className="max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-t-2xl bg-surface-container-lowest shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant p-5">
          <h2 id="routine-form-title" className="text-lg font-semibold text-on-surface">
            {routine ? t('routines.form.editTitle') : t('routines.form.newTitle')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('routines.form.close')} className="rounded-lg p-1 hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div>
            <label className={label} htmlFor="routine-name">
              {t('routines.form.name')}
            </label>
            <input
              id="routine-name"
              className={input}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('routines.form.namePh')}
              maxLength={120}
              autoFocus
            />
          </div>

          <div>
            <label className={label} htmlFor="routine-desc">
              {t('routines.form.description')}
            </label>
            <textarea
              id="routine-desc"
              className={`${input} min-h-[64px]`}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={t('routines.form.descriptionPh')}
              maxLength={1000}
            />
          </div>

          {!routine && canShare ? (
            <div>
              <span className={label}>{t('routines.form.who')}</span>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((p) => (
                  <button
                    key={String(p)}
                    type="button"
                    onClick={() => set('personal', p)}
                    className={[
                      'rounded-lg border p-3 text-left',
                      form.personal === p ? 'border-primary bg-primary/10' : 'border-outline-variant hover:bg-surface-container-low',
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-on-surface">
                      {p ? t('routines.personal') : t('routines.shared')}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {p ? t('routines.form.personalHint') : t('routines.form.sharedHint')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className={label.replace('mb-2 ', '')}>{t('routines.form.days')}</span>
              <div className="flex gap-2 text-[11px] font-bold uppercase">
                <button type="button" className="text-primary hover:underline" onClick={() => set('weekdays', WORKDAYS)}>
                  {t('routines.form.workdays')}
                </button>
                <button type="button" className="text-primary hover:underline" onClick={() => set('weekdays', [...WEEKDAYS])}>
                  {t('routines.form.everyDay')}
                </button>
              </div>
            </div>
            <div className="flex gap-2" role="group" aria-label={t('routines.form.days')}>
              {WEEKDAYS.map((d) => {
                const on = form.weekdays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    title={t(`routines.weekdayLong.${d}`)}
                    onClick={() =>
                      set('weekdays', on ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d].sort())
                    }
                    className={[
                      'h-10 w-10 rounded-full text-sm font-bold transition-colors',
                      on ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
                    ].join(' ')}
                  >
                    {t(`routines.weekdayShort.${d}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className={label}>{t('routines.form.steps')}</span>
            {form.items.length ? (
              <ol className="mb-3 space-y-2">
                {form.items.map((it, idx) => (
                  <li key={it.key} className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs font-bold text-on-surface-variant">{idx + 1}.</span>
                    <input
                      className={`${input} py-2`}
                      value={it.title}
                      maxLength={200}
                      aria-label={t('routines.form.stepN', { n: idx + 1 })}
                      onChange={(e) =>
                        set('items', form.items.map((x) => (x.key === it.key ? { ...x, title: e.target.value } : x)))
                      }
                    />
                    <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} aria-label={t('routines.form.moveUp')} className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">
                      <span className="material-symbols-outlined text-lg">arrow_upward</span>
                    </button>
                    <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === form.items.length - 1} aria-label={t('routines.form.moveDown')} className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">
                      <span className="material-symbols-outlined text-lg">arrow_downward</span>
                    </button>
                    <button type="button" onClick={() => set('items', form.items.filter((x) => x.key !== it.key))} aria-label={t('routines.form.remove')} className="rounded p-1 text-error hover:bg-error/10">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="flex gap-2">
              <input
                className={input}
                value={newItem}
                maxLength={200}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder={t('routines.form.stepPh')}
                aria-label={t('routines.form.addStep')}
              />
              <button type="button" onClick={addItem} className="shrink-0 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/10">
                {t('routines.form.addStep')}
              </button>
            </div>
            {routine ? <p className="mt-2 text-[11px] text-on-surface-variant">{t('routines.form.editStepsHint')}</p> : null}
          </div>

          {!form.personal ? (
            <div>
              <span className={label}>{t('routines.form.assignees')}</span>
              <p className="mb-2 text-[11px] text-on-surface-variant">{t('routines.form.assigneesHint')}</p>
              <input
                className={`${input} mb-2 py-2`}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={t('routines.form.searchUsers')}
                aria-label={t('routines.form.searchUsers')}
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
                {filteredUsers.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-surface-container-low">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={form.assigneeIds.includes(u.id)}
                      onChange={(e) =>
                        set(
                          'assigneeIds',
                          e.target.checked ? [...form.assigneeIds, u.id] : form.assigneeIds.filter((x) => x !== u.id),
                        )
                      }
                    />
                    <span className="text-sm text-on-surface">
                      {`${u.firstName} ${u.lastName}`.trim() || u.email}
                      <span className="ms-2 text-xs text-on-surface-variant">{u.email}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-on-surface-variant">
                {form.assigneeIds.length
                  ? t('routines.form.assigneesCount', { count: form.assigneeIds.length })
                  : t('routines.everyone')}
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-variant p-5">
          <button type="button" onClick={onClose} className="rounded-lg px-5 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high">
            {t('routines.form.cancel')}
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary disabled:opacity-50">
            {saving ? t('common.loading') : t('routines.form.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

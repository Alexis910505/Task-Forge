import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { roleLabel } from '@/lib/roleLabels';

export type AssigneeOption = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: { id: string; name: string } | null;
  role?: { name: string };
};

type AssigneeSearchProps = {
  users: AssigneeOption[];
  value: string;
  onChange: (userId: string) => void;
};

export function AssigneeSearch({ users, value, onChange }: AssigneeSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = users.find((u) => u.id === value);

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.firstName} ${selected.lastName}`.trim());
    }
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users
      .filter((u) => {
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        return name.includes(q) || u.email.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [users, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(u: AssigneeOption) {
    onChange(u.id);
    setQuery(`${u.firstName} ${u.lastName}`.trim());
    setOpen(false);
  }

  function clear() {
    onChange('');
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {t('createTask.assignee')}
      </label>
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          person_search
        </span>
        <input
          type="search"
          value={query}
          onChange={(ev) => {
            setQuery(ev.target.value);
            setOpen(true);
            if (!ev.target.value.trim()) {
              onChange('');
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('createTask.assigneePh')}
          className="w-full rounded-lg border border-outline-variant bg-surface py-3 ps-10 pe-10 text-sm outline-none ring-primary focus:ring-2"
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-on-surface-variant hover:bg-surface-container-high"
            title={t('createTask.assigneeNone')}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        ) : null}
      </div>
      {open && filtered.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg">
          {filtered.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => pick(u)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-container-low"
              >
                <Avatar
                  initials={`${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
                  className="h-8 w-8 text-xs"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="truncate text-[11px] text-on-surface-variant">
                    {u.role?.name ? roleLabel(u.role.name, t) : ''}
                    {u.department?.name ? ` · ${u.department.name}` : ''}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

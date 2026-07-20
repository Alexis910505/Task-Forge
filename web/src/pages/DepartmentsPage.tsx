import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiFetch, apiJson } from '@/lib/api';
import { departmentIcon } from '@/lib/departmentIcon';
import { userHasPermission } from '@/lib/rolePermissions';

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

type DepartmentStatus = 'ACTIVE' | 'REVIEW';

type DepartmentRow = {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  teamCount: number;
  activeTasks: number;
  status: DepartmentStatus;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: { name: string } | null;
  department?: { id: string; name: string } | null;
};

type TeamRow = {
  id: string;
  name: string;
  memberCount: number;
  department?: { id: string; name: string } | null;
};

type ViewMode = 'grid' | 'list';

function userLabel(u: UserRow): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.email;
}

function managerName(
  manager: DepartmentRow['manager'],
  unassigned: string,
): string {
  if (!manager) return unassigned;
  return `${manager.firstName} ${manager.lastName}`.trim() || manager.email;
}

function managerInitials(manager: DepartmentRow['manager']): string {
  if (!manager) return '?';
  return `${manager.firstName?.[0] ?? ''}${manager.lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function DepartmentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = userHasPermission(user, 'departments:write');
  const canCreateDepartment = user?.role?.name === 'ADMIN' && canWrite;
  const canManageManagers =
    userHasPermission(user, 'users:read') && userHasPermission(user, 'users:write');
  const canManageTeams =
    userHasPermission(user, 'teams:read') && userHasPermission(user, 'teams:write');
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orgUsers, setOrgUsers] = useState<UserRow[]>([]);
  const [orgTeams, setOrgTeams] = useState<TeamRow[]>([]);
  const [managerIds, setManagerIds] = useState<Set<string>>(new Set());
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());

  /** Solo jefes de departamento (DEPT_HEAD) se asignan directamente al departamento. */
  const managerUsers = useMemo(
    () => orgUsers.filter((u) => u.role?.name === 'DEPT_HEAD'),
    [orgUsers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiJson<DepartmentRow[]>('/departments');
    setLoading(false);
    if (!res.ok) {
      setError(t('common.loadError', { status: res.status }));
      setRows([]);
      return;
    }
    setError(null);
    setRows(res.data ?? []);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canManageManagers) return;
    void (async () => {
      const res = await apiJson<UserRow[]>('/users');
      if (res.ok && res.data) setOrgUsers(res.data);
    })();
  }, [canManageManagers]);

  useEffect(() => {
    if (!canManageTeams) return;
    void (async () => {
      const res = await apiJson<TeamRow[]>('/teams');
      if (res.ok && res.data) setOrgTeams(res.data);
    })();
  }, [canManageTeams]);

  // Si el modal de edición se abrió antes de que cargaran usuarios/equipos,
  // marca las selecciones actuales cuando lleguen.
  useEffect(() => {
    if (!editing) return;
    setManagerIds(
      new Set(
        orgUsers
          .filter((u) => u.role?.name === 'DEPT_HEAD' && u.department?.id === editing.id)
          .map((u) => u.id),
      ),
    );
    setTeamIds(
      new Set(orgTeams.filter((tm) => tm.department?.id === editing.id).map((tm) => tm.id)),
    );
    // Se re-inicializa al abrir otra edición o al llegar los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, orgUsers.length, orgTeams.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description?.toLowerCase().includes(q) ?? false) ||
        managerName(d.manager, '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  function openCreate() {
    setFormError(null);
    setFormName('');
    setFormDescription('');
    setManagerIds(new Set());
    setTeamIds(new Set());
    setEditing(null);
    setShowCreate(true);
  }

  function openEdit(dept: DepartmentRow) {
    setFormError(null);
    setFormName(dept.name);
    setFormDescription(dept.description ?? '');
    setManagerIds(
      new Set(
        orgUsers
          .filter((u) => u.role?.name === 'DEPT_HEAD' && u.department?.id === dept.id)
          .map((u) => u.id),
      ),
    );
    setTeamIds(
      new Set(orgTeams.filter((tm) => tm.department?.id === dept.id).map((tm) => tm.id)),
    );
    setShowCreate(false);
    setEditing(dept);
  }

  function closeForm() {
    setShowCreate(false);
    setEditing(null);
    setFormError(null);
  }

  function toggleIn(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /** Sincroniza los gerentes asignados (departmentId del usuario) según la selección. */
  async function syncManagers(deptId: string, previousIds: Set<string>) {
    const added = [...managerIds].filter((id) => !previousIds.has(id));
    const removed = [...previousIds].filter((id) => !managerIds.has(id));
    await Promise.all([
      ...added.map((id) =>
        apiFetch(`/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ departmentId: deptId }),
        }),
      ),
      ...removed.map((id) =>
        apiFetch(`/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ departmentId: null }),
        }),
      ),
    ]);
    const res = await apiJson<UserRow[]>('/users');
    if (res.ok && res.data) setOrgUsers(res.data);
  }

  /** Sincroniza los equipos del departamento (departmentId del equipo) según la selección. */
  async function syncTeams(deptId: string, previousIds: Set<string>) {
    const added = [...teamIds].filter((id) => !previousIds.has(id));
    const removed = [...previousIds].filter((id) => !teamIds.has(id));
    await Promise.all([
      ...added.map((id) =>
        apiFetch(`/teams/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ departmentId: deptId }),
        }),
      ),
      ...removed.map((id) =>
        apiFetch(`/teams/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ departmentId: null }),
        }),
      ),
    ]);
    const res = await apiJson<TeamRow[]>('/teams');
    if (res.ok && res.data) setOrgTeams(res.data);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const name = formName.trim();
    if (name.length < 2) {
      setFormError(t('departments.validationName'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: formDescription.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setFormError(await parseApiError(res, t('departments.createFailed')));
        return;
      }
      const created = (await res.json()) as { id?: string };
      if (created.id) {
        if (canManageManagers && managerIds.size > 0) {
          await syncManagers(created.id, new Set());
        }
        if (canManageTeams && teamIds.size > 0) {
          await syncTeams(created.id, new Set());
        }
      }
      closeForm();
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    const name = formName.trim();
    if (name.length < 2) {
      setFormError(t('departments.validationName'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/departments/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          description: formDescription.trim(),
        }),
      });
      if (!res.ok) {
        setFormError(await parseApiError(res, t('departments.updateFailed')));
        return;
      }
      if (canManageManagers) {
        const previous = new Set(
          orgUsers
            .filter((u) => u.role?.name === 'DEPT_HEAD' && u.department?.id === editing.id)
            .map((u) => u.id),
        );
        await syncManagers(editing.id, previous);
      }
      if (canManageTeams) {
        const previous = new Set(
          orgTeams.filter((tm) => tm.department?.id === editing.id).map((tm) => tm.id),
        );
        await syncTeams(editing.id, previous);
      }
      closeForm();
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  const formOpen = showCreate || editing != null;

  return (
    <div>
      <PageHeader
        title={t('departments.title')}
        subtitle={t('departments.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreateDepartment ? (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary hover:opacity-90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                {t('departments.addDepartment')}
              </button>
            ) : null}
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low p-1">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={[
                  'rounded px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors',
                  view === 'grid'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high',
                ].join(' ')}
              >
                {t('departments.gridView')}
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={[
                  'rounded px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors',
                  view === 'list'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high',
                ].join(' ')}
              >
                {t('departments.listView')}
              </button>
            </div>
          </div>
        }
      />

      <div className="relative mb-6 max-w-md">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('departments.searchPlaceholder')}
          className="w-full rounded-full border-0 bg-surface-container-low py-2.5 pl-10 pr-4 text-sm text-on-surface outline-none ring-primary-container focus:ring-2"
        />
      </div>

      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
          <p className="text-on-surface-variant">
            {search.trim() ? t('departments.noSearchResults') : t('departments.empty')}
          </p>
          {canCreateDepartment && !search.trim() ? (
            <button
              type="button"
              onClick={() => openCreate()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary hover:opacity-90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {t('departments.emptyCta')}
            </button>
          ) : null}
        </div>
      ) : null}

      {view === 'grid' && filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dept) => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              t={t}
              canWrite={canWrite}
              onEdit={() => openEdit(dept)}
            />
          ))}
        </div>
      ) : null}

      {view === 'list' && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-outline-variant">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('departments.deptCol')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('departments.managerCol')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('departments.membersCol')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('departments.tasksCol')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('departments.statusCol')}
                </th>
                {canWrite ? (
                  <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                    <span className="sr-only">{t('departments.editDepartment')}</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 bg-surface-container-lowest">
              {filtered.map((dept) => (
                <tr key={dept.id} className="hover:bg-surface-container-low">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-secondary-container p-2 text-on-secondary-container">
                        <span className="material-symbols-outlined">{departmentIcon(dept.name, dept.id)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{dept.name}</p>
                        {dept.description ? (
                          <p className="mt-0.5 text-xs text-on-surface-variant">{dept.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={managerInitials(dept.manager)} className="h-8 w-8 text-xs" />
                      <span className="font-medium text-on-surface">
                        {managerName(dept.manager, t('departments.noManager'))}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-on-surface">{dept.memberCount}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{dept.activeTasks}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={dept.status} t={t} />
                  </td>
                  {canWrite ? (
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => openEdit(dept)}
                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-bold uppercase text-on-surface transition-colors hover:border-primary hover:text-primary"
                        aria-label={t('departments.editDepartment')}
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        {t('departments.editDepartment')}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {formOpen && canWrite ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dept-form-title"
          onClick={() => closeForm()}
        >
          <div
            className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dept-form-title" className="text-lg font-semibold text-on-surface">
              {editing ? t('departments.editTitle') : t('departments.createTitle')}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {editing ? t('departments.editHint') : t('departments.createHint')}
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(ev) => void (editing ? submitEdit(ev) : submitCreate(ev))}
            >
              {formError ? (
                <p className="text-sm text-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <label className="block">
                <span className="text-xs font-bold uppercase text-on-surface-variant">
                  {t('departments.nameLabel')}
                </span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('departments.namePlaceholder')}
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2"
                  autoFocus
                  required
                  minLength={2}
                  maxLength={120}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-on-surface-variant">
                  {t('departments.descriptionLabel')}
                </span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('departments.descriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                  className="mt-1 w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2"
                />
              </label>
              {canManageTeams ? (
                <div>
                  <span className="text-xs font-bold uppercase text-on-surface-variant">
                    {t('departments.teamsLabel')} ({teamIds.size})
                  </span>
                  <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
                    {orgTeams.map((team) => {
                      const otherDept =
                        team.department && team.department.id !== editing?.id
                          ? team.department.name
                          : null;
                      return (
                        <label
                          key={team.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low"
                        >
                          <input
                            type="checkbox"
                            checked={teamIds.has(team.id)}
                            onChange={() => toggleIn(setTeamIds, team.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="min-w-0 flex-1 truncate text-on-surface">
                            {team.name}
                          </span>
                          <span className="shrink-0 text-[10px] text-on-surface-variant">
                            {t('departments.membersCount', { count: team.memberCount })}
                          </span>
                          {otherDept ? (
                            <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[10px] text-on-surface-variant">
                              {otherDept}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                    {orgTeams.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-on-surface-variant">
                        {t('departments.teamsEmpty')}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {t('departments.teamsHint')}
                  </p>
                </div>
              ) : null}
              {canManageManagers ? (
                <div>
                  <span className="text-xs font-bold uppercase text-on-surface-variant">
                    {t('departments.managersLabel')} ({managerIds.size})
                  </span>
                  <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
                    {managerUsers.map((u) => {
                      const otherDept =
                        u.department && u.department.id !== editing?.id
                          ? u.department.name
                          : null;
                      return (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low"
                        >
                          <input
                            type="checkbox"
                            checked={managerIds.has(u.id)}
                            onChange={() => toggleIn(setManagerIds, u.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="min-w-0 flex-1 truncate text-on-surface">
                            {userLabel(u)}
                          </span>
                          {otherDept ? (
                            <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[10px] text-on-surface-variant">
                              {otherDept}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                    {managerUsers.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-on-surface-variant">
                        {t('departments.managersEmpty')}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {t('departments.managersHint')}
                  </p>
                </div>
              ) : null}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => closeForm()}
                  className="flex-1 rounded-lg border border-outline-variant py-3 text-sm font-bold uppercase"
                >
                  {t('departments.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold uppercase text-on-primary disabled:opacity-50"
                >
                  {submitting
                    ? t('departments.saving')
                    : editing
                      ? t('departments.saveChanges')
                      : t('departments.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DepartmentCard({
  dept,
  t,
  canWrite,
  onEdit,
}: {
  dept: DepartmentRow;
  t: TFunction;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const icon = departmentIcon(dept.name, dept.id);
  const unassigned = t('departments.noManager');

  return (
    <article className="group flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 transition-all hover:border-primary">
      <div className="flex items-start justify-between gap-2">
        <div className="rounded-xl bg-secondary-container p-3 text-on-secondary-container">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={dept.status} t={t} />
          {canWrite ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              aria-label={t('departments.editDepartment')}
              title={t('departments.editDepartment')}
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-on-surface">{dept.name}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          {dept.description ?? t('departments.noDescription')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-outline-variant/30 py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            {t('departments.teamCount')}
          </p>
          <p className="text-lg font-semibold text-on-surface">
            {t('departments.membersCount', { count: dept.memberCount })}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            {t('departments.activeTasks')}
          </p>
          <p className="text-lg font-semibold text-primary">{dept.activeTasks}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar initials={managerInitials(dept.manager)} className="h-8 w-8 shrink-0 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            {t('departments.manager')}
          </p>
          <p className="truncate text-sm font-semibold text-on-surface">
            {managerName(dept.manager, unassigned)}
          </p>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: DepartmentStatus;
  t: TFunction;
}) {
  const isReview = status === 'REVIEW';
  return (
    <span
      className={[
        'shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide',
        isReview
          ? 'bg-error-container text-on-error-container'
          : 'bg-tertiary-container text-on-tertiary',
      ].join(' ')}
    >
      {t(`departments.statusLabels.${status}`)}
    </span>
  );
}

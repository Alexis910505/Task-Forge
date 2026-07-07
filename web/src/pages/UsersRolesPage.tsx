import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { apiFetch, apiJson } from '@/lib/api';
import { ROLE_PERMISSIONS, type RoleNameKey } from '@/lib/rolePermissions';
import { permissionHint, permissionLabel, permissionsForDisplay } from '@/lib/permissionLabels';
import { roleLabel } from '@/lib/roleLabels';

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: { id: string; name: string };
  department?: { id: string; name: string } | null;
};

type RoleRow = { id: string; name: string };
type DeptRow = { id: string; name: string };
type ModalMode = 'create' | 'edit' | 'moveDept' | null;
type TabKey = 'users' | 'roles' | 'permissions';

async function parseApiError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
  return msg || fallback;
}

function userInitials(u: UserRow): string {
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

function shortUserId(id: string): string {
  const tail = id.replace(/-/g, '').slice(-4).toUpperCase();
  return `#USR-${tail}`;
}

function roleBadgeClass(roleName: string): string {
  switch (roleName) {
    case 'ADMIN':
      return 'bg-primary-container/10 text-primary border-primary-container/20';
    case 'MANAGER':
      return 'bg-secondary-container/30 text-secondary border-secondary-container/50';
    case 'WORKER':
      return 'bg-surface-container-highest text-on-surface-variant border-outline-variant';
    default:
      return 'bg-surface-variant/40 text-on-secondary-container border-outline-variant';
  }
}

export function UsersRolesPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('users');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeptId, setBulkDeptId] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [uRes, rRes, dRes] = await Promise.all([
      apiJson<UserRow[]>('/users'),
      apiJson<RoleRow[]>('/users/roles'),
      apiJson<DeptRow[]>('/departments'),
    ]);
    setLoading(false);
    if (!uRes.ok) {
      setError(t('common.loadError', { status: uRes.status }));
      setUsers([]);
      return;
    }
    setError(null);
    setUsers(uRes.data ?? []);
    if (rRes.ok && rRes.data) {
      setRoles(rRes.data);
    }
    if (dRes.ok && dRes.data) {
      setDepartments(dRes.data);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.role.name} ${u.department?.name ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, search]);

  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      counts[u.role.name] = (counts[u.role.name] ?? 0) + 1;
    }
    return counts;
  }, [users]);

  const allSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => selected.has(u.id));
  const someSelected = selected.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filteredUsers.map((u) => u.id)));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function closeModal() {
    setModalMode(null);
    setEditingUserId(null);
    setFormError(null);
    setPassword('');
    setBulkDeptId('');
  }

  function openCreate() {
    setFormError(null);
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setRoleId(roles[0]?.id ?? '');
    setDepartmentId('');
    setIsActive(true);
    setEditingUserId(null);
    setModalMode('create');
  }

  function openEdit(u: UserRow) {
    setFormError(null);
    setEmail(u.email);
    setPassword('');
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setRoleId(u.role.id);
    setDepartmentId(u.department?.id ?? '');
    setIsActive(u.isActive);
    setEditingUserId(u.id);
    setModalMode('edit');
  }

  useEffect(() => {
    if (modalMode === 'create' && roles.length && !roleId) {
      setRoleId(roles[0].id);
    }
  }, [modalMode, roles, roleId]);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password.length < 8) {
      setFormError(t('users.validationPassword'));
      return;
    }
    if (!roleId) {
      setFormError(t('users.validationRole'));
      return;
    }
    setSubmitting(true);
    const res = await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roleId,
        departmentId: departmentId || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('users.createFailed')));
      return;
    }
    closeModal();
    await load();
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUserId) return;
    setFormError(null);
    if (password.length > 0 && password.length < 8) {
      setFormError(t('users.validationPassword'));
      return;
    }
    if (!roleId) {
      setFormError(t('users.validationRole'));
      return;
    }
    setSubmitting(true);
    const body: Record<string, unknown> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      roleId,
      isActive,
      departmentId: departmentId || null,
    };
    if (password.length >= 8) {
      body.password = password;
    }
    const res = await apiFetch(`/users/${editingUserId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('users.editFailed')));
      return;
    }
    closeModal();
    await load();
  }

  async function deleteUser(u: UserRow) {
    if (currentUser?.id === u.id) {
      setError(t('users.cannotDeleteSelf'));
      return;
    }
    const name = `${u.firstName} ${u.lastName}`.trim();
    if (!window.confirm(t('users.deleteConfirm', { name }))) {
      return;
    }
    setDeletingId(u.id);
    setError(null);
    const res = await apiFetch(`/users/${u.id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (!res.ok) {
      setError(await parseApiError(res, t('users.deleteFailed')));
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(u.id);
      return next;
    });
    await load();
  }

  async function bulkDelete() {
    const ids = [...selected].filter((id) => id !== currentUser?.id);
    if (ids.length === 0) {
      setError(t('users.cannotDeleteSelf'));
      return;
    }
    if (!window.confirm(t('users.bulkDeleteConfirm', { count: ids.length }))) {
      return;
    }
    setSubmitting(true);
    setError(null);
    for (const id of ids) {
      const res = await apiFetch(`/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(await parseApiError(res, t('users.deleteFailed')));
        break;
      }
    }
    setSubmitting(false);
    setSelected(new Set());
    await load();
  }

  async function submitBulkMoveDept(e: React.FormEvent) {
    e.preventDefault();
    const ids = [...selected];
    if (ids.length === 0) return;
    setSubmitting(true);
    setFormError(null);
    for (const id of ids) {
      const res = await apiFetch(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ departmentId: bulkDeptId || null }),
      });
      if (!res.ok) {
        setFormError(await parseApiError(res, t('users.editFailed')));
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(false);
    closeModal();
    setSelected(new Set());
    await load();
  }

  const isCreate = modalMode === 'create';
  const isEdit = modalMode === 'edit';

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface md:text-[32px] md:leading-10">{t('users.title')}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t('users.subtitle')}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1">
          {(['users', 'roles', 'permissions'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                'rounded-lg px-4 py-1.5 text-xs font-bold uppercase transition-colors',
                tab === key
                  ? 'bg-surface-container-highest text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high',
              ].join(' ')}
            >
              {key === 'users'
                ? t('users.tabAllUsers')
                : key === 'roles'
                  ? t('users.tabRoles')
                  : t('users.tabPermissions')}
            </button>
          ))}
        </div>
      </div>

      {tab === 'users' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
                placeholder={t('users.searchPlaceholder')}
                className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-2 ps-10 pe-4 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
              />
            </div>
            <button
              type="button"
              onClick={() => openCreate()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary hover:opacity-90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {t('users.invite')}
            </button>
          </div>

          {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
          {error ? (
            <p className="mb-4 text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-low px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-outline text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-bold uppercase text-on-surface-variant">{t('users.selectAll')}</span>
                </label>
                {someSelected ? (
                  <>
                    <span className="hidden h-4 w-px bg-outline-variant sm:block" />
                    <span className="text-sm text-on-surface-variant">
                      {t('users.selectedCount', { count: selected.size })}
                    </span>
                  </>
                ) : null}
              </div>
              {someSelected ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkDeptId('');
                      setModalMode('moveDept');
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold uppercase text-on-surface-variant hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-lg">folder_shared</span>
                    {t('users.bulkMoveDept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void bulkDelete()}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg border border-error/20 px-3 py-1.5 text-xs font-bold uppercase text-error hover:bg-error/5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    {t('users.bulkDelete')}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container/30">
                    <th className="w-12 px-6 py-4" />
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('users.nameCol')}
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('users.emailCol')}
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('users.roleCol')}
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('users.deptCol')}
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('users.statusCol')}
                    </th>
                    <th className="px-6 py-4 text-end text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('users.actionsCol')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {filteredUsers.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant">
                        {t('users.empty')}
                      </td>
                    </tr>
                  ) : null}
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="group transition-colors hover:bg-surface-container-low">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="size-4 rounded border-outline text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar initials={userInitials(u)} className="h-10 w-10 text-sm" />
                          <div>
                            <p className="text-sm font-semibold text-on-surface">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-[11px] font-bold text-primary">{shortUserId(u.id)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">{u.email}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-block rounded border px-2 py-1 text-[11px] font-bold uppercase ${roleBadgeClass(u.role.name)}`}
                        >
                          {roleLabel(u.role.name, t)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface">{u.department?.name ?? '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-tertiary' : 'bg-outline'}`}
                          />
                          <span
                            className={`text-[11px] font-bold uppercase ${u.isActive ? 'text-tertiary' : 'text-outline'}`}
                          >
                            {u.isActive ? t('users.active') : t('users.inactive')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
                            title={t('users.edit')}
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteUser(u)}
                            disabled={deletingId === u.id}
                            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                            title={t('users.delete')}
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-outline-variant bg-surface-container/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-on-surface-variant">
                {t('users.showingUsers', {
                  from: filteredUsers.length ? 1 : 0,
                  to: filteredUsers.length,
                  total: users.length,
                })}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">{t('users.statTotal')}</p>
              <p className="text-2xl font-bold text-primary">{users.length}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">{t('users.statActive')}</p>
              <p className="text-2xl font-bold text-on-surface">{activeCount}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">{t('users.statRoles')}</p>
              <p className="text-2xl font-bold text-on-surface">{roles.length}</p>
            </div>
            <div className="relative flex items-center justify-between overflow-hidden rounded-xl bg-primary-container p-4 text-on-primary-container md:col-span-1">
              <div className="relative z-10">
                <h3 className="font-semibold">{t('users.expansionTitle')}</h3>
                <p className="mt-1 max-w-[200px] text-sm opacity-90">{t('users.expansionBody')}</p>
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="mt-4 rounded-lg bg-on-primary-container px-4 py-2 text-xs font-bold uppercase text-primary-container hover:opacity-90"
                >
                  {t('users.expansionCta')}
                </button>
              </div>
              <span className="material-symbols-outlined absolute -end-4 -bottom-4 text-[100px] opacity-10">
                group_add
              </span>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'roles' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
            >
              <span
                className={`inline-block rounded border px-2 py-1 text-[11px] font-bold uppercase ${roleBadgeClass(r.name)}`}
              >
                {roleLabel(r.name, t)}
              </span>
              <p className="mt-4 text-3xl font-bold text-primary">{roleCounts[r.name] ?? 0}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{t('users.roleMembers')}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'permissions' ? (
        <div>
          <p className="mb-4 text-sm text-on-surface-variant">{t('users.permissionColHint')}</p>
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container/30">
                  <th className="sticky left-0 bg-surface-container/30 px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                    {t('users.permissionCol')}
                  </th>
                  {(Object.keys(ROLE_PERMISSIONS) as RoleNameKey[]).map((role) => (
                    <th
                      key={role}
                      className="px-3 py-3 text-center text-[10px] font-bold uppercase text-on-surface-variant"
                    >
                      {roleLabel(role, t)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {permissionsForDisplay().map((perm) => (
                  <tr key={perm} className="group hover:bg-surface-container-low/50">
                    <td className="sticky left-0 bg-surface-container-lowest px-4 py-3 group-hover:bg-surface-container-low/50">
                      <p className="text-sm font-medium text-on-surface">{permissionLabel(perm, t)}</p>
                      {permissionHint(perm, t) ? (
                        <p className="mt-0.5 text-xs text-on-surface-variant">{permissionHint(perm, t)}</p>
                      ) : null}
                    </td>
                    {(Object.keys(ROLE_PERMISSIONS) as RoleNameKey[]).map((role) => {
                      const has = (ROLE_PERMISSIONS[role] as readonly string[]).includes(perm);
                      return (
                        <td key={role} className="px-3 py-2 text-center">
                          {has ? (
                            <span className="material-symbols-outlined text-lg text-tertiary">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-lg text-outline-variant/40">remove</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      ) : null}

      {modalMode === 'moveDept' ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => closeModal()}
        >
          <div
            className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-on-surface">{t('users.moveDeptTitle')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {t('users.selectedCount', { count: selected.size })}
            </p>
            <form className="mt-6 space-y-4" onSubmit={(ev) => void submitBulkMoveDept(ev)}>
              {formError ? <p className="text-sm text-error">{formError}</p> : null}
              <select
                value={bulkDeptId}
                onChange={(ev) => setBulkDeptId(ev.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
              >
                <option value="">{t('users.deptNone')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => closeModal()}
                  className="flex-1 rounded-lg border border-outline-variant py-3 text-sm font-bold uppercase"
                >
                  {t('users.cancelCreate')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold uppercase text-on-primary disabled:opacity-50"
                >
                  {submitting ? t('users.saving') : t('users.moveDeptSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalMode === 'create' || modalMode === 'edit' ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => closeModal()}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-on-surface">
              {isCreate ? t('users.createTitle') : t('users.editTitle')}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {isCreate ? t('users.createSubtitle') : t('users.editSubtitle')}
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(ev) => void (isCreate ? submitCreate(ev) : submitEdit(ev))}
            >
              {formError ? <p className="text-sm text-error">{formError}</p> : null}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('profile.email')}
                </label>
                <input
                  type="email"
                  required
                  readOnly={isEdit}
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className={`w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2 ${isEdit ? 'cursor-not-allowed opacity-70' : ''}`}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {isCreate ? t('users.password') : t('users.passwordOptional')}
                </label>
                <input
                  type="password"
                  required={isCreate}
                  minLength={isCreate ? 8 : undefined}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                  autoComplete={isCreate ? 'new-password' : 'off'}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('users.firstName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('users.lastName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('users.selectRole')}
                </label>
                <select
                  required
                  value={roleId}
                  onChange={(ev) => setRoleId(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {roleLabel(r.name, t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('users.selectDepartment')}
                </label>
                <select
                  value={departmentId}
                  onChange={(ev) => setDepartmentId(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                >
                  <option value="">{t('users.deptNone')}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              {isEdit ? (
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(ev) => setIsActive(ev.target.checked)}
                    className="size-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-on-surface">{t('users.isActiveLabel')}</span>
                </label>
              ) : null}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => closeModal()}
                  className="flex-1 rounded-lg border border-outline-variant py-3 text-sm font-bold uppercase text-on-surface"
                >
                  {t('users.cancelCreate')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold uppercase text-on-primary disabled:opacity-50"
                >
                  {submitting
                    ? isCreate
                      ? t('users.creating')
                      : t('users.saving')
                    : isCreate
                      ? t('users.submitCreate')
                      : t('users.submitEdit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

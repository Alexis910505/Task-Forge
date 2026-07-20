import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { apiFetch, apiJson } from '@/lib/api';
import {
  canAssignRoleByHierarchy,
  canDeleteUserByHierarchy,
  canEditUserByHierarchy,
  userHasPermission,
} from '@/lib/rolePermissions';
import { permissionHint, permissionLabel, permissionsForDisplay } from '@/lib/permissionLabels';
import { roleLabel } from '@/lib/roleLabels';

type EmploymentType = 'PART_TIME' | 'FULL_TIME' | 'FULL_TIME_SEASONAL';

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  employmentType?: EmploymentType;
  role: { id: string; name: string };
  department?: { id: string; name: string } | null;
};

type RoleRow = {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  _count?: { users: number };
};
type DeptRow = { id: string; name: string };
type ModalMode = 'create' | 'edit' | 'moveDept' | null;
type RoleModalMode = 'create' | 'edit' | null;
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
    case 'DEPT_HEAD':
      return 'bg-secondary-container/30 text-secondary border-secondary-container/50';
    case 'SUPERVISOR':
      return 'bg-primary-container/20 text-on-primary-container border-primary-container/40';
    case 'TEAM_LEAD':
      return 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary-container/50';
    case 'WORKER':
      return 'bg-surface-container-highest text-on-surface-variant border-outline-variant';
    default:
      return 'bg-surface-variant/40 text-on-secondary-container border-outline-variant';
  }
}

export function UsersRolesPage() {
  const { t } = useTranslation();
  const { user: currentUser, refreshProfile } = useAuth();
  const canWriteRoles =
    currentUser?.role?.name === 'ADMIN' && userHasPermission(currentUser, 'users:write');
  const canCreateUsers = currentUser?.role?.name === 'ADMIN';
  // Solo el administrador puede cambiar correo y contraseña de otros usuarios.
  const canEditCredentials = currentUser?.role?.name === 'ADMIN';
  const canManageUsers = userHasPermission(currentUser, 'users:write');
  const isAdmin = currentUser?.role?.name === 'ADMIN';
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
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');

  const [roleModal, setRoleModal] = useState<RoleModalMode>(null);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [roleName, setRoleName] = useState('');
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [permSavingId, setPermSavingId] = useState<string | null>(null);

  const editingSelf =
    modalMode === 'edit' && editingUserId != null && editingUserId === currentUser?.id;
  const canChangeRoleInForm = Boolean(
    isAdmin || (modalMode === 'edit' && !editingSelf) || modalMode === 'create',
  );
  const canChangeActiveInForm = Boolean(
    isAdmin || (modalMode === 'edit' && !editingSelf) || modalMode === 'create',
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [uRes, rRes, dRes] = await Promise.all([
      apiJson<UserRow[]>('/users'),
      apiJson<RoleRow[]>('/roles'),
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

  const assignableRoles = useMemo(() => {
    const actorRole = currentUser?.role?.name;
    if (!actorRole || isAdmin) return roles;
    return roles.filter(
      (r) =>
        canAssignRoleByHierarchy(actorRole, r.name) ||
        (editingSelf && r.id === roleId),
    );
  }, [roles, currentUser?.role?.name, isAdmin, editingSelf, roleId]);

  const selectableForBulk = useMemo(
    () =>
      filteredUsers.filter(
        (u) => canEditUserByHierarchy(currentUser, u) && u.id !== currentUser?.id,
      ),
    [filteredUsers, currentUser],
  );

  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      counts[u.role.name] = (counts[u.role.name] ?? 0) + 1;
    }
    return counts;
  }, [users]);

  const allSelected =
    selectableForBulk.length > 0 && selectableForBulk.every((u) => selected.has(u.id));
  const someSelected = selected.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableForBulk.map((u) => u.id)));
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
    setShowPassword(false);
    setBulkDeptId('');
  }

  function openCreate() {
    setFormError(null);
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setFirstName('');
    setLastName('');
    setRoleId(roles[0]?.id ?? '');
    setDepartmentId('');
    setIsActive(true);
    setEmploymentType('FULL_TIME');
    setEditingUserId(null);
    setModalMode('create');
  }

  function openEdit(u: UserRow) {
    if (!canEditUserByHierarchy(currentUser, u)) {
      setError(t('users.hierarchyForbidden'));
      return;
    }
    setFormError(null);
    setEmail(u.email);
    setPassword('');
    setShowPassword(false);
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setRoleId(u.role.id);
    setDepartmentId(u.department?.id ?? '');
    setIsActive(u.isActive);
    setEmploymentType(u.employmentType ?? 'FULL_TIME');
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
        employmentType,
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
    const selfEdit = editingUserId === currentUser?.id;
    setSubmitting(true);
    const body: Record<string, unknown> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      departmentId: departmentId || null,
      employmentType,
    };
    if (isAdmin || !selfEdit) {
      body.roleId = roleId;
      body.isActive = isActive;
    }
    if (canEditCredentials) {
      body.email = email.trim().toLowerCase();
      if (password.length >= 8) {
        body.password = password;
      }
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
    if (selfEdit) {
      await refreshProfile();
    }
  }

  async function deleteUser(u: UserRow) {
    if (currentUser?.id === u.id) {
      setError(t('users.cannotDeleteSelf'));
      return;
    }
    if (!canDeleteUserByHierarchy(currentUser, u)) {
      setError(t('users.hierarchyForbidden'));
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
    const ids = [...selected].filter((id) => {
      const u = users.find((row) => row.id === id);
      return u != null && canDeleteUserByHierarchy(currentUser, u);
    });
    if (ids.length === 0) {
      setError(t('users.hierarchyForbidden'));
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
    const ids = [...selected].filter((id) => {
      const u = users.find((row) => row.id === id);
      return u != null && canEditUserByHierarchy(currentUser, u);
    });
    if (ids.length === 0) {
      setFormError(t('users.hierarchyForbidden'));
      return;
    }
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

  function openCreateRole() {
    setRoleFormError(null);
    setEditingRole(null);
    setRoleName('');
    setRolePerms(new Set());
    setRoleModal('create');
  }

  function openEditRole(role: RoleRow) {
    setRoleFormError(null);
    setEditingRole(role);
    setRoleName(role.name);
    setRolePerms(new Set(role.permissions ?? []));
    setRoleModal('edit');
  }

  function closeRoleModal() {
    setRoleModal(null);
    setEditingRole(null);
    setRoleFormError(null);
  }

  function toggleRolePerm(perm: string) {
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  async function submitRole(e: React.FormEvent) {
    e.preventDefault();
    const name = roleName.trim();
    if (name.length < 2) {
      setRoleFormError(t('users.roleValidationName'));
      return;
    }
    setSubmitting(true);
    setRoleFormError(null);
    const body = {
      name,
      permissions: [...rolePerms],
    };
    const res =
      roleModal === 'edit' && editingRole
        ? await apiFetch(`/roles/${editingRole.id}`, {
            method: 'PATCH',
            body: JSON.stringify(
              editingRole.isSystem ? { permissions: body.permissions } : body,
            ),
          })
        : await apiFetch('/roles', {
            method: 'POST',
            body: JSON.stringify(body),
          });
    setSubmitting(false);
    if (!res.ok) {
      setRoleFormError(
        await parseApiError(
          res,
          roleModal === 'edit' ? t('users.roleUpdateFailed') : t('users.roleCreateFailed'),
        ),
      );
      return;
    }
    closeRoleModal();
    await load();
    if (editingRole && currentUser?.role?.id === editingRole.id) {
      await refreshProfile();
    }
  }

  async function deleteRole(role: RoleRow) {
    if (role.name === 'ADMIN') return;
    if (!window.confirm(t('users.roleDeleteConfirm', { name: roleLabel(role, t) }))) {
      return;
    }
    setError(null);
    const res = await apiFetch(`/roles/${role.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(await parseApiError(res, t('users.roleDeleteFailed')));
      return;
    }
    await load();
  }

  async function togglePermissionInMatrix(role: RoleRow, perm: string) {
    if (!canWriteRoles) return;
    const next = new Set(role.permissions ?? []);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    setPermSavingId(role.id);
    setError(null);
    const res = await apiFetch(`/roles/${role.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions: [...next] }),
    });
    setPermSavingId(null);
    if (!res.ok) {
      setError(await parseApiError(res, t('users.roleUpdateFailed')));
      return;
    }
    setRoles((prev) =>
      prev.map((r) => (r.id === role.id ? { ...r, permissions: [...next] } : r)),
    );
    if (currentUser?.role?.id === role.id) {
      await refreshProfile();
    }
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
            {canCreateUsers ? (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary hover:opacity-90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                {t('users.invite')}
              </button>
            ) : null}
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
                {canManageUsers ? (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-outline text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-bold uppercase text-on-surface-variant">
                      {t('users.selectAll')}
                    </span>
                  </label>
                ) : null}
                {canManageUsers && someSelected ? (
                  <>
                    <span className="hidden h-4 w-px bg-outline-variant sm:block" />
                    <span className="text-sm text-on-surface-variant">
                      {t('users.selectedCount', { count: selected.size })}
                    </span>
                  </>
                ) : null}
              </div>
              {canManageUsers && someSelected ? (
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
                      {t('users.employmentCol')}
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
                      <td colSpan={8} className="px-6 py-10 text-center text-on-surface-variant">
                        {t('users.empty')}
                      </td>
                    </tr>
                  ) : null}
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="group transition-colors hover:bg-surface-container-low">
                      <td className="px-6 py-4">
                        {canManageUsers &&
                        canEditUserByHierarchy(currentUser, u) &&
                        u.id !== currentUser?.id ? (
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleSelect(u.id)}
                            className="size-4 rounded border-outline text-primary focus:ring-primary"
                          />
                        ) : null}
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
                          {roleLabel(u.role, t)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface">
                        {t(`users.employmentTypes.${u.employmentType ?? 'FULL_TIME'}`)}
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
                        {canManageUsers && canEditUserByHierarchy(currentUser, u) ? (
                          <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
                              title={t('users.edit')}
                            >
                              <span className="material-symbols-outlined text-xl">edit</span>
                            </button>
                            {canDeleteUserByHierarchy(currentUser, u) ? (
                              <button
                                type="button"
                                onClick={() => void deleteUser(u)}
                                disabled={deletingId === u.id}
                                className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                                title={t('users.delete')}
                              >
                                <span className="material-symbols-outlined text-xl">delete</span>
                              </button>
                            ) : null}
                          </div>
                        ) : null}
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
                {canCreateUsers ? (
                  <button
                    type="button"
                    onClick={() => openCreate()}
                    className="mt-4 rounded-lg bg-on-primary-container px-4 py-2 text-xs font-bold uppercase text-primary-container hover:opacity-90"
                  >
                    {t('users.expansionCta')}
                  </button>
                ) : null}
              </div>
              <span className="material-symbols-outlined absolute -end-4 -bottom-4 text-[100px] opacity-10">
                group_add
              </span>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'roles' ? (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-on-surface-variant">{t('users.rolesHint')}</p>
            {canWriteRoles ? (
              <button
                type="button"
                onClick={() => openCreateRole()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary hover:opacity-90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                {t('users.createRole')}
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-block rounded border px-2 py-1 text-[11px] font-bold uppercase ${roleBadgeClass(r.name)}`}
                  >
                    {roleLabel(r, t)}
                  </span>
                  {r.isSystem ? (
                    <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-surface-variant">
                      {t('users.systemRole')}
                    </span>
                  ) : null}
                </div>
                <p className="text-3xl font-bold text-primary">
                  {r._count?.users ?? roleCounts[r.name] ?? 0}
                </p>
                <p className="text-sm text-on-surface-variant">{t('users.roleMembers')}</p>
                <p className="text-xs text-on-surface-variant">
                  {t('users.rolePermCount', { count: r.permissions?.length ?? 0 })}
                </p>
                {canWriteRoles ? (
                  <div className="mt-auto flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openEditRole(r)}
                      className="flex-1 rounded-lg border border-outline-variant py-2 text-xs font-bold uppercase hover:border-primary hover:text-primary"
                    >
                      {t('users.editRole')}
                    </button>
                    {r.name !== 'ADMIN' ? (
                      <button
                        type="button"
                        onClick={() => void deleteRole(r)}
                        className="rounded-lg border border-error/30 px-3 py-2 text-xs font-bold uppercase text-error hover:bg-error-container/30"
                      >
                        {t('users.delete')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'permissions' ? (
        <div>
          <p className="mb-4 text-sm text-on-surface-variant">
            {canWriteRoles ? t('users.permissionEditHint') : t('users.permissionColHint')}
          </p>
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container/30">
                  <th className="sticky left-0 bg-surface-container/30 px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                    {t('users.permissionCol')}
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.id}
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
                    {roles.map((role) => {
                      const has = (role.permissions ?? []).includes(perm);
                      const busy = permSavingId === role.id;
                      if (!canWriteRoles) {
                        return (
                          <td key={role.id} className="px-3 py-2 text-center">
                            {has ? (
                              <span className="material-symbols-outlined text-lg text-tertiary">check_circle</span>
                            ) : (
                              <span className="material-symbols-outlined text-lg text-outline-variant/40">remove</span>
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={role.id} className="px-3 py-2 text-center">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void togglePermissionInMatrix(role, perm)}
                            className="rounded p-1 disabled:opacity-40"
                            aria-label={permissionLabel(perm, t)}
                            title={permissionLabel(perm, t)}
                          >
                            {has ? (
                              <span className="material-symbols-outlined text-lg text-tertiary">check_circle</span>
                            ) : (
                              <span className="material-symbols-outlined text-lg text-outline-variant/40">
                                radio_button_unchecked
                              </span>
                            )}
                          </button>
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

      {(modalMode === 'create' && canCreateUsers) || (modalMode === 'edit' && canManageUsers) ? (
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
                  readOnly={isEdit && !canEditCredentials}
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className={`w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2 ${isEdit && !canEditCredentials ? 'cursor-not-allowed opacity-70' : ''}`}
                  autoComplete="off"
                />
              </div>
              {isCreate || canEditCredentials ? (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {isCreate ? t('users.password') : t('users.passwordOptional')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={isCreate}
                      minLength={isCreate ? 8 : undefined}
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface p-3 pr-12 text-sm outline-none ring-primary focus:ring-2"
                      autoComplete={isCreate ? 'new-password' : 'off'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                      aria-label={showPassword ? t('users.hidePassword') : t('users.showPassword')}
                      title={showPassword ? t('users.hidePassword') : t('users.showPassword')}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
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
                  disabled={!canChangeRoleInForm}
                  onChange={(ev) => setRoleId(ev.target.value)}
                  className={`w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2 ${!canChangeRoleInForm ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  {assignableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {roleLabel(r, t)}
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
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('users.employmentLabel')}
                </label>
                <select
                  required
                  value={employmentType}
                  onChange={(ev) => setEmploymentType(ev.target.value as EmploymentType)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                >
                  <option value="FULL_TIME">{t('users.employmentTypes.FULL_TIME')}</option>
                  <option value="PART_TIME">{t('users.employmentTypes.PART_TIME')}</option>
                  <option value="FULL_TIME_SEASONAL">
                    {t('users.employmentTypes.FULL_TIME_SEASONAL')}
                  </option>
                </select>
              </div>
              {isEdit ? (
                <label
                  className={`flex items-center gap-3 ${canChangeActiveInForm ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    disabled={!canChangeActiveInForm}
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

      {roleModal && canWriteRoles ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => closeRoleModal()}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-on-surface">
              {roleModal === 'edit' ? t('users.editRoleTitle') : t('users.createRoleTitle')}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {roleModal === 'edit' ? t('users.editRoleHint') : t('users.createRoleHint')}
            </p>
            <form className="mt-6 space-y-4" onSubmit={(ev) => void submitRole(ev)}>
              {roleFormError ? (
                <p className="text-sm text-error" role="alert">
                  {roleFormError}
                </p>
              ) : null}
              <label className="block">
                <span className="text-xs font-bold uppercase text-on-surface-variant">
                  {t('users.roleNameLabel')}
                </span>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={editingRole?.isSystem}
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder={t('users.roleNamePlaceholder')}
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2 disabled:opacity-60"
                />
              </label>
              <div>
                <span className="text-xs font-bold uppercase text-on-surface-variant">
                  {t('users.rolePermissionsLabel')} ({rolePerms.size})
                </span>
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
                  {permissionsForDisplay().map((perm) => (
                    <label
                      key={perm}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low"
                    >
                      <input
                        type="checkbox"
                        checked={rolePerms.has(perm)}
                        onChange={() => toggleRolePerm(perm)}
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-on-surface">{permissionLabel(perm, t)}</span>
                        {permissionHint(perm, t) ? (
                          <span className="block text-xs text-on-surface-variant">
                            {permissionHint(perm, t)}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => closeRoleModal()}
                  className="flex-1 rounded-lg border border-outline-variant py-3 text-sm font-bold uppercase"
                >
                  {t('users.cancelCreate')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold uppercase text-on-primary disabled:opacity-50"
                >
                  {submitting ? t('users.saving') : t('users.submitEdit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

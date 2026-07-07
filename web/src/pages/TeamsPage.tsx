import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiFetch, apiJson } from '@/lib/api';
import { roleHasPermission } from '@/lib/rolePermissions';
import { roleLabel } from '@/lib/roleLabels';
import { teamIcon } from '@/lib/teamIcon';

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (typeof data.message === 'string' && data.message.trim()) return data.message;
  } catch {
    /* ignore */
  }
  return fallback;
}

type TeamMemberRow = {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

type TeamRow = {
  id: string;
  name: string;
  department?: { id: string; name: string } | null;
  memberCount: number;
  activeTasks: number;
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  members: TeamMemberRow[];
};

type DeptOption = { id: string; name: string };
type UserOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: { name: string };
};

type ViewMode = 'grid' | 'list';

function memberName(u: TeamMemberRow['user']): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.email;
}

function memberInitials(u: TeamMemberRow['user']): string {
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

function leadName(lead: TeamRow['lead'], unassigned: string): string {
  if (!lead) return unassigned;
  return `${lead.firstName} ${lead.lastName}`.trim() || lead.email;
}

export function TeamsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = roleHasPermission(user?.role?.name, 'teams:write');
  const canListUsers = roleHasPermission(user?.role?.name, 'users:read');

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDeptId, setCreateDeptId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [detailTeam, setDetailTeam] = useState<TeamRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [addUserId, setAddUserId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [teamsRes, deptRes, usersRes] = await Promise.all([
      apiJson<TeamRow[]>('/teams'),
      apiJson<DeptOption[]>('/departments'),
      canListUsers ? apiJson<UserOption[]>('/users') : Promise.resolve({ ok: true, data: [] as UserOption[] }),
    ]);
    setLoading(false);
    if (!teamsRes.ok) {
      setError(t('common.loadError', { status: teamsRes.status }));
      setTeams([]);
      return;
    }
    setTeams(teamsRes.data ?? []);
    if (deptRes.ok) setDepartments(deptRes.data ?? []);
    if (usersRes.ok) setAllUsers(usersRes.data ?? []);
  }, [t, canListUsers]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(q) ||
        (team.department?.name.toLowerCase().includes(q) ?? false) ||
        leadName(team.lead, '').toLowerCase().includes(q) ||
        team.members.some((m) => memberName(m.user).toLowerCase().includes(q)),
    );
  }, [teams, search]);

  const totalMembers = useMemo(
    () => teams.reduce((acc, team) => acc + team.memberCount, 0),
    [teams],
  );
  const totalOpenTasks = useMemo(
    () => teams.reduce((acc, team) => acc + team.activeTasks, 0),
    [teams],
  );

  function openCreate() {
    setFormError(null);
    setCreateName('');
    setCreateDeptId('');
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
    setFormError(null);
  }

  function openDetail(team: TeamRow) {
    setDetailTeam(team);
    setEditName(team.name);
    setEditDeptId(team.department?.id ?? '');
    setAddUserId('');
    setFormError(null);
  }

  function closeDetail() {
    setDetailTeam(null);
    setFormError(null);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const name = createName.trim();
    if (name.length < 2) {
      setFormError(t('teams.validationName'));
      return;
    }
    setSubmitting(true);
    const res = await apiFetch('/teams', {
      method: 'POST',
      body: JSON.stringify({
        name,
        departmentId: createDeptId || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('teams.createFailed')));
      return;
    }
    closeCreate();
    await load();
  }

  async function saveDetail(e: React.FormEvent) {
    e.preventDefault();
    if (!detailTeam) return;
    setFormError(null);
    const name = editName.trim();
    if (name.length < 2) {
      setFormError(t('teams.validationName'));
      return;
    }
    setSubmitting(true);
    const res = await apiFetch(`/teams/${detailTeam.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name,
        departmentId: editDeptId || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('teams.updateFailed')));
      return;
    }
    await load();
    closeDetail();
  }

  async function deleteTeam() {
    if (!detailTeam || !window.confirm(t('teams.deleteConfirm'))) return;
    setSubmitting(true);
    const res = await apiFetch(`/teams/${detailTeam.id}`, { method: 'DELETE' });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('teams.deleteFailed')));
      return;
    }
    closeDetail();
    await load();
  }

  async function addMember() {
    if (!detailTeam || !addUserId) return;
    setFormError(null);
    setSubmitting(true);
    const res = await apiFetch(`/teams/${detailTeam.id}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId: addUserId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('teams.addMemberFailed')));
      return;
    }
    setAddUserId('');
    await load();
    const refreshed = (await apiJson<TeamRow[]>('/teams')).data?.find((x) => x.id === detailTeam.id);
    if (refreshed) openDetail(refreshed);
  }

  async function removeMember(userId: string) {
    if (!detailTeam) return;
    setSubmitting(true);
    const res = await apiFetch(`/teams/${detailTeam.id}/members/${userId}`, {
      method: 'DELETE',
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('teams.removeMemberFailed')));
      return;
    }
    await load();
    const refreshed = (await apiJson<TeamRow[]>('/teams')).data?.find((x) => x.id === detailTeam.id);
    if (refreshed) openDetail(refreshed);
    else closeDetail();
  }

  const availableToAdd = useMemo(() => {
    if (!detailTeam) return [];
    const inTeam = new Set(detailTeam.members.map((m) => m.user.id));
    return allUsers.filter((u) => !inTeam.has(u.id));
  }, [detailTeam, allUsers]);

  return (
    <div>
      <PageHeader
        title={t('teams.title')}
        subtitle={t('teams.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canWrite ? (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary hover:opacity-90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                {t('teams.addTeam')}
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
                {t('teams.gridView')}
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
                {t('teams.listView')}
              </button>
            </div>
          </div>
        }
      />

      {!loading && teams.length > 0 ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label={t('teams.statTeams')} value={String(teams.length)} icon="groups" />
          <StatCard label={t('teams.statMembers')} value={String(totalMembers)} icon="person" />
          <StatCard
            label={t('teams.statOpenTasks')}
            value={String(totalOpenTasks)}
            icon="assignment"
            highlight
          />
        </div>
      ) : null}

      <div className="relative mb-6 max-w-md">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('teams.searchPlaceholder')}
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
            {search.trim() ? t('teams.noSearchResults') : t('teams.empty')}
          </p>
          {canWrite && !search.trim() ? (
            <button
              type="button"
              onClick={() => openCreate()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary hover:opacity-90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {t('teams.emptyCta')}
            </button>
          ) : null}
        </div>
      ) : null}

      {view === 'grid' && filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((team) => (
            <TeamCard key={team.id} team={team} t={t} onOpen={() => openDetail(team)} />
          ))}
        </div>
      ) : null}

      {view === 'list' && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-outline-variant">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('teams.teamCol')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('teams.deptCol')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('teams.lead')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('teams.membersCol')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">
                  {t('teams.tasksCol')}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 bg-surface-container-lowest">
              {filtered.map((team) => (
                <tr key={team.id} className="hover:bg-surface-container-low">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-secondary-container p-2 text-on-secondary-container">
                        <span className="material-symbols-outlined">{teamIcon(team.name, team.id)}</span>
                      </div>
                      <span className="font-semibold text-on-surface">{team.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {team.department?.name ?? t('teams.noDepartment')}
                  </td>
                  <td className="px-4 py-3">{leadName(team.lead, t('teams.noLead'))}</td>
                  <td className="px-4 py-3 font-semibold">{team.memberCount}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{team.activeTasks}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(team)}
                      className="text-xs font-bold uppercase text-primary hover:underline"
                    >
                      {t('teams.manage')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {showCreate && canWrite ? (
        <Modal title={t('teams.createTitle')} onClose={closeCreate}>
          <p className="mb-4 text-sm text-on-surface-variant">{t('teams.createHint')}</p>
          <form className="space-y-4" onSubmit={(ev) => void submitCreate(ev)}>
            {formError ? <p className="text-sm text-error">{formError}</p> : null}
            <label className="block">
              <span className="text-xs font-bold uppercase text-on-surface-variant">
                {t('teams.nameLabel')}
              </span>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                required
                minLength={2}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-on-surface-variant">
                {t('teams.departmentLabel')}
              </span>
              <select
                value={createDeptId}
                onChange={(e) => setCreateDeptId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('teams.noDepartment')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <ModalActions
              cancelLabel={t('teams.cancel')}
              onCancel={closeCreate}
              submitLabel={submitting ? t('teams.saving') : t('teams.save')}
              submitting={submitting}
            />
          </form>
        </Modal>
      ) : null}

      {detailTeam ? (
        <Modal title={detailTeam.name} onClose={closeDetail} wide>
          <form className="space-y-6" onSubmit={(ev) => void saveDetail(ev)}>
            {formError ? <p className="text-sm text-error">{formError}</p> : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-on-surface-variant">
                  {t('teams.nameLabel')}
                </span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  readOnly={!canWrite}
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none read-only:opacity-80 focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-on-surface-variant">
                  {t('teams.departmentLabel')}
                </span>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  disabled={!canWrite}
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none disabled:opacity-60 focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('teams.noDepartment')}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-4 rounded-lg bg-surface-container-low p-4 text-sm">
              <span>
                <strong className="text-on-surface">{detailTeam.memberCount}</strong>{' '}
                <span className="text-on-surface-variant">{t('teams.members')}</span>
              </span>
              <span>
                <strong className="text-primary">{detailTeam.activeTasks}</strong>{' '}
                <span className="text-on-surface-variant">{t('teams.openTasks')}</span>
              </span>
              <span className="text-on-surface-variant">
                {t('teams.lead')}: {leadName(detailTeam.lead, t('teams.noLead'))}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-on-surface">{t('teams.membersTitle')}</h3>
              {detailTeam.members.length === 0 ? (
                <p className="mt-2 text-sm text-on-surface-variant">{t('teams.noMembers')}</p>
              ) : (
                <ul className="mt-3 divide-y divide-outline-variant/40 rounded-lg border border-outline-variant">
                  {detailTeam.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar initials={memberInitials(m.user)} className="h-9 w-9 shrink-0 text-xs" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-on-surface">
                            {memberName(m.user)}
                          </p>
                          <p className="truncate text-xs text-on-surface-variant">
                            {roleLabel(m.user.role, t)} · {m.user.email}
                          </p>
                        </div>
                      </div>
                      {canWrite ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void removeMember(m.user.id)}
                          className="shrink-0 text-xs font-bold uppercase text-error hover:underline disabled:opacity-50"
                        >
                          {t('teams.removeMember')}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canWrite && canListUsers ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="block flex-1">
                  <span className="text-xs font-bold uppercase text-on-surface-variant">
                    {t('teams.addMemberLabel')}
                  </span>
                  <select
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('teams.pickMember')}</option>
                    {availableToAdd.map((u) => (
                      <option key={u.id} value={u.id}>
                        {`${u.firstName} ${u.lastName}`.trim() || u.email} — {roleLabel(u.role.name, t)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!addUserId || submitting}
                  onClick={() => void addMember()}
                  className="rounded-lg bg-secondary-container px-4 py-2.5 text-xs font-bold uppercase text-on-secondary-container disabled:opacity-50"
                >
                  {t('teams.addMember')}
                </button>
              </div>
            ) : canWrite ? (
              <p className="text-xs text-on-surface-variant">{t('teams.addMemberNoUsers')}</p>
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-outline-variant/40 pt-4">
              {canWrite ? (
                <>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-on-primary disabled:opacity-50"
                  >
                    {submitting ? t('teams.saving') : t('teams.saveChanges')}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void deleteTeam()}
                    className="rounded-lg border border-error px-4 py-2.5 text-xs font-bold uppercase text-error disabled:opacity-50"
                  >
                    {t('teams.deleteTeam')}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg border border-outline-variant px-4 py-2.5 text-xs font-bold uppercase"
              >
                {t('teams.close')}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div
        className={[
          'rounded-xl p-3',
          highlight ? 'bg-primary-container text-on-primary-container' : 'bg-secondary-container text-on-secondary-container',
        ].join(' ')}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p className="text-2xl font-semibold text-on-surface">{value}</p>
      </div>
    </div>
  );
}

function TeamCard({
  team,
  t,
  onOpen,
}: {
  team: TeamRow;
  t: TFunction;
  onOpen: () => void;
}) {
  const icon = teamIcon(team.name, team.id);
  const preview = team.members.slice(0, 4);

  return (
    <article className="group flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 transition-all hover:border-primary">
      <div className="flex items-start justify-between gap-2">
        <div className="rounded-xl bg-secondary-container p-3 text-on-secondary-container">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
          {team.memberCount} {t('teams.members')}
        </span>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-on-surface">{team.name}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          {team.department?.name ?? t('teams.noDepartment')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-outline-variant/30 py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            {t('teams.openTasks')}
          </p>
          <p className="text-lg font-semibold text-primary">{team.activeTasks}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            {t('teams.lead')}
          </p>
          <p className="truncate text-sm font-semibold text-on-surface">
            {leadName(team.lead, t('teams.noLead'))}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex -space-x-2">
          {preview.length > 0 ? (
            preview.map((m) => (
              <Avatar
                key={m.id}
                initials={memberInitials(m.user)}
                className="h-8 w-8 border-2 border-surface-container-lowest text-xs"
              />
            ))
          ) : (
            <span className="text-xs text-on-surface-variant">{t('teams.noMembers')}</span>
          )}
          {team.memberCount > 4 ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-high text-[10px] font-bold">
              +{team.memberCount - 4}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold uppercase text-primary transition-colors hover:bg-surface-container-low"
        >
          {t('teams.manage')}
        </button>
      </div>
    </article>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={[
          'max-h-[90vh] w-full overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl',
          wide ? 'max-w-2xl' : 'max-w-md',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  cancelLabel,
  onCancel,
  submitLabel,
  submitting,
}: {
  cancelLabel: string;
  onCancel: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-lg border border-outline-variant py-3 text-sm font-bold uppercase"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold uppercase text-on-primary disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}

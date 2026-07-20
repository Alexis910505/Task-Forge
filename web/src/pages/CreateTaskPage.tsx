import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { LocationMapPicker } from '@/components/maps/LocationMapPicker';
import { AssigneeSearch, type AssigneeOption } from '@/components/tasks/AssigneeSearch';
import { DescriptionEditor } from '@/components/tasks/DescriptionEditor';
import {
  TaskAttachmentPicker,
  type PendingAttachment,
} from '@/components/tasks/TaskAttachmentPicker';
import { apiFetch, apiJson } from '@/lib/api';
import { roleLabel } from '@/lib/roleLabels';
import { clearTaskDraft, loadTaskDraft, saveTaskDraft } from '@/lib/taskDraft';
import {
  apiIsoToLocalDateInput,
  localDateInputToApiIso,
  todayLocalDateString,
} from '@/lib/dueDates';
import { uploadTaskAttachment } from '@/lib/taskAttachments';
import { DraftSubtasksEditor, type DraftSubtask } from '@/components/tasks/DraftSubtasksEditor';

type ProjectRow = {
  id: string;
  name: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  boards: { id: string; name: string }[];
};
type DeptRow = { id: string; name: string };
type TeamRow = {
  id: string;
  name: string;
  departmentId?: string | null;
  members: { user: AssigneeOption }[];
};
type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  location?: string | null;
  dueDate?: string | null;
  boardId: string;
  assigneeId?: string | null;
  assignee?: { id: string } | null;
  board?: { name: string; project?: { name: string; departmentId?: string | null } };
  parentTask?: { id: string; title: string } | null;
};

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as const;
const SUBTASK_STATUSES = ['TODO', 'COMPLETED'] as const;

export function CreateTaskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { taskId: editTaskId } = useParams<{ taskId?: string }>();
  const isEdit = Boolean(editTaskId);
  const [searchParams] = useSearchParams();
  const preferredBoardId = searchParams.get('boardId');
  const lockedFromKanban = !isEdit && Boolean(preferredBoardId);
  const minDueDate = todayLocalDateString();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [users, setUsers] = useState<AssigneeOption[]>([]);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [boardId, setBoardId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('TODO');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [location, setLocation] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [initialDueDate, setInitialDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [pendingSubtasks, setPendingSubtasks] = useState<DraftSubtask[]>([]);
  const [isSubtaskEdit, setIsSubtaskEdit] = useState(false);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    setError(null);
    const [pRes, uRes, dRes, tRes, taskRes] = await Promise.all([
      apiJson<ProjectRow[]>('/projects'),
      apiJson<AssigneeOption[]>('/users'),
      apiJson<DeptRow[]>('/departments'),
      apiJson<TeamRow[]>('/teams'),
      isEdit && editTaskId
        ? apiJson<TaskRow>(`/tasks/${editTaskId}`)
        : Promise.resolve({ ok: true as const, data: null as TaskRow | null, status: 200 }),
    ]);
    setLoadingMeta(false);

    if (dRes.ok && dRes.data) setDepartments(dRes.data);
    if (tRes.ok && tRes.data) setTeams(tRes.data);
    if (uRes.ok && uRes.data) {
      setUsers(
        uRes.data.filter((u) => (u as AssigneeOption & { isActive?: boolean }).isActive !== false),
      );
    }

    if (!pRes.ok) {
      setError(t('common.loadError', { status: pRes.status }));
      setProjects([]);
      return;
    }
    const list = pRes.data ?? [];
    setProjects(list);

    if (isEdit && editTaskId) {
      if (!taskRes.ok || !taskRes.data) {
        setError(t('common.loadError', { status: taskRes.status }));
        return;
      }
      const task = taskRes.data;
      setBoardId(task.boardId);
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(
        task.parentTask
          ? task.status === 'COMPLETED'
            ? 'COMPLETED'
            : 'TODO'
          : task.status,
      );
      setPriority(task.priority);
      setAssigneeId(task.assigneeId ?? task.assignee?.id ?? '');
      setLocation(task.location ?? '');
      const due = apiIsoToLocalDateInput(task.dueDate);
      setDueDate(due);
      setInitialDueDate(due);
      const projDept = task.board?.project?.departmentId;
      if (projDept) setDepartmentId(projDept);
      setIsSubtaskEdit(Boolean(task.parentTask));
      return;
    }

    setIsSubtaskEdit(false);

    const draft = loadTaskDraft();
    const opts = list.flatMap((p) =>
      p.boards.map((b) => ({ boardId: b.id, project: p })),
    );
    const preferred = opts.find((o) => o.boardId === preferredBoardId);

    if (draft && !preferred) {
      setTitle(draft.title);
      setDescription(draft.description);
      setPriority(draft.priority);
      setAssigneeId(draft.assigneeId);
      setLocation(draft.location);
      setDueDate(draft.dueDate);
      setDepartmentId(draft.departmentId);
      setTeamId(draft.teamId);
      setBoardId(draft.boardId);
      setPendingSubtasks(
        (draft.subtasks ?? []).map((title) => ({ id: crypto.randomUUID(), title })),
      );
      setDraftNotice(t('createTask.draftRestored'));
    } else if (preferred) {
      setBoardId(preferred.boardId);
      if (preferred.project.departmentId) {
        setDepartmentId(preferred.project.departmentId);
      }
    } else if (opts[0]) {
      setBoardId(opts[0].boardId);
      if (opts[0].project.departmentId) {
        setDepartmentId(opts[0].project.departmentId);
      }
    }
  }, [t, preferredBoardId, isEdit, editTaskId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const boardOptions = useMemo(() => {
    return projects.flatMap((p) => {
      if (departmentId && p.departmentId !== departmentId) return [];
      return p.boards.map((b) => ({ id: b.id, label: p.name, project: p }));
    });
  }, [projects, departmentId]);

  const filteredTeams = useMemo(() => {
    if (!departmentId) return teams;
    return teams.filter((tm) => tm.departmentId === departmentId || !tm.departmentId);
  }, [teams, departmentId]);

  const lockedProjectName = projects.find((p) => p.boards.some((b) => b.id === boardId))?.name ?? '';

  const suggestedUsers = useMemo(() => {
    if (teamId) {
      const team = teams.find((tm) => tm.id === teamId);
      if (team?.members.length) {
        return team.members.map((m) => m.user).slice(0, 4);
      }
    }
    if (departmentId) {
      const matched = users.filter((u) => u.department?.id === departmentId);
      if (matched.length) return matched.slice(0, 4);
    }
    return users.slice(0, 4);
  }, [users, teams, teamId, departmentId]);

  useEffect(() => {
    if (!departmentId || isEdit) return;
    const stillValid = boardOptions.some((b) => b.id === boardId);
    if (!stillValid && boardOptions[0]) {
      setBoardId(boardOptions[0].id);
    }
  }, [departmentId, boardOptions, boardId, isEdit]);

  useEffect(() => {
    if (!teamId) return;
    const team = teams.find((tm) => tm.id === teamId);
    if (team?.departmentId && team.departmentId !== departmentId) {
      setDepartmentId(team.departmentId);
    }
  }, [teamId, teams, departmentId]);

  async function uploadPendingFiles(taskId: string): Promise<string | null> {
    if (pendingAttachments.length === 0) return null;
    setUploadingAttachments(true);
    for (const { file } of pendingAttachments) {
      const res = await uploadTaskAttachment(taskId, file);
      if (!res.ok) {
        setUploadingAttachments(false);
        if (res.status === 400 || res.status === 413) {
          return t('createTask.fileTooLarge', { name: file.name });
        }
        return res.message || t('createTask.uploadFailed', { name: file.name });
      }
    }
    setUploadingAttachments(false);
    return null;
  }

  async function createPendingSubtasks(parentTaskId: string, boardIdForSubtasks: string): Promise<string | null> {
    for (const sub of pendingSubtasks) {
      const title = sub.title.trim();
      if (!title) continue;
      const res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          parentTaskId,
          boardId: boardIdForSubtasks,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        return msg || t('createTask.subtaskCreateFailed', { name: title });
      }
    }
    return null;
  }

  function handleSaveDraft() {
    if (isEdit) return;
    saveTaskDraft({
      boardId,
      title,
      description,
      priority,
      assigneeId,
      location,
      dueDate,
      departmentId,
      teamId,
      subtasks: pendingSubtasks.map((s) => s.title).filter(Boolean),
    });
    setDraftNotice(t('createTask.draftSaved'));
  }

  function handleDiscard() {
    if (!isEdit) clearTaskDraft();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('createTask.validationBoardTitle'));
      return;
    }
    if (!isEdit && !boardId) {
      setError(t('createTask.validationBoardTitle'));
      return;
    }
    if (dueDate && dueDate < minDueDate && dueDate !== initialDueDate) {
      setError(t('createTask.dueDatePast'));
      return;
    }
    setSubmitting(true);
    setError(null);

    if (isEdit && editTaskId) {
      const res = await apiFetch(`/tasks/${editTaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || '',
          status,
          priority,
          assigneeId: assigneeId || '',
          location: location.trim() || '',
          dueDate: localDateInputToApiIso(dueDate),
        }),
      });
      if (!res.ok) {
        setSubmitting(false);
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        setError(msg || t('common.loadError', { status: res.status }));
        return;
      }
      const uploadErr = await uploadPendingFiles(editTaskId);
      const subtaskErr =
        pendingSubtasks.length > 0
          ? await createPendingSubtasks(editTaskId, boardId)
          : null;
      setSubmitting(false);
      if (uploadErr || subtaskErr) {
        setError(
          [uploadErr, subtaskErr].filter(Boolean).join(' ') ||
            t('createTask.uploadPartialFailed'),
        );
        navigate(`/tasks/${editTaskId}`, { replace: true });
        return;
      }
      navigate(`/tasks/${editTaskId}`, { replace: true });
      return;
    }

    const res = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        boardId,
        priority,
        assigneeId: assigneeId || undefined,
        location: location.trim() || undefined,
        dueDate: localDateInputToApiIso(dueDate),
      }),
    });
    if (!res.ok) {
      setSubmitting(false);
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      setError(msg || t('common.loadError', { status: res.status }));
      return;
    }
    const created = (await res.json()) as { id: string };
    clearTaskDraft();
    const subtaskErr =
      pendingSubtasks.length > 0
        ? await createPendingSubtasks(created.id, boardId)
        : null;
    const uploadErr = await uploadPendingFiles(created.id);
    setSubmitting(false);
    if (uploadErr || subtaskErr) {
      setError(
        [uploadErr, subtaskErr].filter(Boolean).join(' ') || t('createTask.uploadPartialFailed'),
      );
      navigate(`/tasks/${created.id}`, { replace: true });
      return;
    }
    if (lockedFromKanban) {
      navigate('/kanban', { replace: true });
      return;
    }
    navigate(`/tasks/${created.id}`, { replace: true });
  }

  const cancelHref = isEdit && editTaskId ? `/tasks/${editTaskId}` : lockedFromKanban ? '/kanban' : '/dashboard';
  const breadcrumbParent = isEdit
    ? { href: `/tasks/${editTaskId}`, label: t('taskDetail.breadcrumbTasks') }
    : lockedFromKanban
      ? { href: '/kanban', label: t('nav.kanban') }
      : { href: '/dashboard', label: t('common.dashboard') };

  const priorityLabelKey = (p: string) =>
    p === 'LOW'
      ? 'createTask.priorityLow'
      : p === 'MEDIUM'
        ? 'createTask.priorityMedium'
        : p === 'HIGH'
          ? 'createTask.priorityHigh'
          : 'createTask.priorityCritical';

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase text-on-surface-variant">
        <Link to={breadcrumbParent.href} className="hover:text-primary">
          {breadcrumbParent.label}
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        {isEdit && editTaskId ? (
          <>
            <Link to={`/tasks/${editTaskId}`} className="hover:text-primary">
              {t('taskDetail.inspectionId', { id: editTaskId.slice(0, 8) })}
            </Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </>
        ) : null}
        <span className="text-primary">
          {isEdit ? t('createTask.breadcrumbEdit') : t('createTask.breadcrumbNew')}
        </span>
      </div>

      {loadingMeta ? <p className="mb-4 text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? (
        <p className="mb-4 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {draftNotice ? (
        <p className="mb-4 text-sm text-tertiary" role="status">
          {draftNotice}
        </p>
      ) : null}
      {attachmentError ? (
        <p className="mb-4 text-sm text-error" role="alert">
          {attachmentError}
        </p>
      ) : null}

      <form onSubmit={(ev) => void onSubmit(ev)}>
        <div className="mx-auto max-w-[1000px] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-outline-variant bg-surface-container-low/30 p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">{t('createTask.sectionTitle')}</h2>
              <p className="text-sm text-on-surface-variant">{t('createTask.sectionSubtitle')}</p>
            </div>
            <span className="w-fit rounded-full bg-secondary-container px-3 py-1 text-xs font-bold uppercase text-on-secondary-container">
              {isEdit ? t('createTask.editBadge') : t('createTask.draft')}
            </span>
          </div>

          <div className="space-y-6 p-6">
            {!isEdit && !lockedFromKanban ? (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('createTask.project')}
                </label>
                <select
                  value={boardId}
                  onChange={(ev) => {
                    const id = ev.target.value;
                    setBoardId(id);
                    const proj = projects.find((p) => p.boards.some((b) => b.id === id));
                    if (proj?.departmentId) setDepartmentId(proj.departmentId);
                  }}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                  required
                >
                  {boardOptions.length === 0 ? (
                    <option value="">{t('createTask.noBoards')}</option>
                  ) : (
                    boardOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : null}

            {(lockedFromKanban || isEdit) && lockedProjectName ? (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('createTask.project')}
                </label>
                <p className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 text-sm font-semibold text-on-surface">
                  {lockedProjectName}
                </p>
                {lockedFromKanban ? (
                  <p className="mt-1 text-[11px] text-on-surface-variant">{t('createTask.projectLockedHint')}</p>
                ) : null}
                {isEdit ? (
                  <p className="mt-1 text-[11px] text-on-surface-variant">{t('createTask.projectReadonlyHint')}</p>
                ) : null}
              </div>
            ) : null}

            {isEdit ? (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('createTask.status')}
                </label>
                <select
                  value={status}
                  onChange={(ev) => setStatus(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                >
                  {(isSubtaskEdit ? SUBTASK_STATUSES : STATUSES).map((s) => (
                    <option key={s} value={s}>
                      {isSubtaskEdit
                        ? s === 'COMPLETED'
                          ? t('taskDetail.subtaskDone')
                          : t('taskDetail.subtaskTodo')
                        : t(`dashboard.status.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-8">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('createTask.taskTitle')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                  placeholder={t('createTask.taskTitlePh')}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-base outline-none ring-primary focus:border-transparent focus:ring-2"
                  required
                />
              </div>
              <div className="md:col-span-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('createTask.priority')}
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(ev) => setPriority(ev.target.value)}
                    className="w-full appearance-none rounded-lg border border-outline-variant bg-surface p-3 pe-10 text-base outline-none ring-primary focus:ring-2"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {t(priorityLabelKey(p))}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            <DescriptionEditor value={description} onChange={setDescription} />

            {!isSubtaskEdit ? (
              <DraftSubtasksEditor
                items={pendingSubtasks}
                onChange={setPendingSubtasks}
                disabled={submitting || uploadingAttachments}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('createTask.department')}
                </label>
                <div className="relative">
                  <select
                    value={departmentId}
                    onChange={(ev) => {
                      setDepartmentId(ev.target.value);
                      setTeamId('');
                    }}
                    className="w-full appearance-none rounded-lg border border-outline-variant bg-surface p-3 pe-10 text-sm outline-none ring-primary focus:ring-2"
                  >
                    <option value="">{t('createTask.deptNone')}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    expand_more
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('createTask.team')}
                </label>
                <div className="relative">
                  <select
                    value={teamId}
                    onChange={(ev) => setTeamId(ev.target.value)}
                    className="w-full appearance-none rounded-lg border border-outline-variant bg-surface p-3 pe-10 text-sm outline-none ring-primary focus:ring-2"
                  >
                    <option value="">{t('createTask.teamNone')}</option>
                    {filteredTeams.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    expand_more
                  </span>
                </div>
              </div>
              <AssigneeSearch users={users} value={assigneeId} onChange={setAssigneeId} />
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('createTask.dueDate')}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  min={isEdit && initialDueDate && initialDueDate < minDueDate ? initialDueDate : minDueDate}
                  onChange={(ev) => setDueDate(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('createTask.location')}
              </label>
              <LocationMapPicker value={location} onChange={setLocation} />
            </div>

            <TaskAttachmentPicker
              value={pendingAttachments}
              onChange={setPendingAttachments}
              onError={setAttachmentError}
              disabled={submitting || uploadingAttachments}
            />

            <div className="flex flex-col gap-3 border-t border-outline-variant pt-6 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={submitting || uploadingAttachments || (!isEdit && !boardId)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-4 text-lg font-semibold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {uploadingAttachments
                  ? t('createTask.uploadingAttachments')
                  : submitting
                    ? t('common.loading')
                    : isEdit
                      ? t('createTask.saveBtn')
                      : t('createTask.createBtn')}
                <span className="material-symbols-outlined">{isEdit ? 'save' : 'send'}</span>
              </button>
              {!isEdit ? (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="rounded-lg border border-outline-variant px-6 py-4 text-center text-sm font-bold uppercase text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 sm:px-8"
                >
                  {t('createTask.saveDraft')}
                </button>
              ) : null}
              <Link
                to={cancelHref}
                onClick={handleDiscard}
                className="px-4 py-4 text-center text-xs font-bold uppercase text-error hover:underline"
              >
                {t('createTask.discard')}
              </Link>
            </div>
          </div>
        </div>
      </form>

      {!isEdit ? (
        <div className="mx-auto mt-8 grid max-w-[1000px] grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex gap-4 rounded-xl border border-outline-variant bg-secondary-container/15 p-6">
            <span className="material-symbols-outlined shrink-0 text-3xl text-primary">info</span>
            <div>
              <h4 className="font-semibold text-on-surface">{t('createTask.guidelinesTitle')}</h4>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{t('createTask.guidelinesBody')}</p>
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <h4 className="mb-4 text-xs font-bold uppercase text-on-surface-variant">{t('createTask.suggested')}</h4>
            <div className="space-y-3">
              {suggestedUsers.length === 0 ? (
                <p className="text-sm text-on-surface-variant">{t('createTask.suggestedEmpty')}</p>
              ) : (
                suggestedUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setAssigneeId(u.id)}
                    className={[
                      'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors',
                      assigneeId === u.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-surface-container-low',
                    ].join(' ')}
                  >
                    <Avatar
                      initials={`${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
                      className="h-10 w-10"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {u.role?.name ? roleLabel(u.role, t) : t('createTask.assigneeNone')}
                        {u.department?.name ? ` · ${u.department.name}` : ''}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

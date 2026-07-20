import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiFetch, apiJson } from '@/lib/api';
import { formatDueDateLabel, isDueDateOverdue } from '@/lib/dueDates';
import { taskPriorityPillClass, taskStatusChartColor } from '@/lib/taskStatusColors';
import {
  canCreateTasks,
  canManageProjects,
  getStoredProjectId,
  setStoredProjectId,
} from '@/lib/projectAccess';

type ProjectRow = {
  id: string;
  name: string;
  description?: string | null;
  boards: { id: string; name: string }[];
};

type BoardColumn = { status: string; tasks: BoardTask[] };
type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  description?: string | null;
  assignee?: { firstName: string; lastName: string; email: string } | null;
  taskAssets?: { asset: { name: string } }[];
  comments?: { id: string }[];
  attachments?: { id: string }[];
  _count?: { subtasks: number };
};

type BoardPayload = { id: string; name: string; columns: BoardColumn[] };
type DeptRow = { id: string; name: string };

const STATUS_ORDER = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as const;
const TASK_DRAG_MIME = 'application/x-taskforge-task-id';

function moveTaskInBoard(board: BoardPayload, taskId: string, newStatus: string): BoardPayload {
  let moved: BoardTask | null = null;
  const columns = board.columns.map((col) => ({
    ...col,
    tasks: col.tasks.filter((t) => {
      if (t.id === taskId) {
        moved = { ...t, status: newStatus };
        return false;
      }
      return true;
    }),
  }));
  if (!moved) {
    return board;
  }
  return {
    ...board,
    columns: columns.map((col) =>
      col.status === newStatus ? { ...col, tasks: [...col.tasks, moved!] } : col,
    ),
  };
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
  return msg || fallback;
}

export function KanbanPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWriteProjects = canManageProjects(user?.role?.name);
  const canAddTask = canCreateTasks(user?.role?.name);
  const canDragTasks = canAddTask;

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDepartmentId, setProjectDepartmentId] = useState('');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const activeBoardId = selectedProject?.boards[0]?.id ?? null;
  const newTaskHref = activeBoardId ? `/tasks/new?boardId=${activeBoardId}` : null;

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError(null);
    const [pRes, dRes] = await Promise.all([
      apiJson<ProjectRow[]>('/projects'),
      canWriteProjects ? apiJson<DeptRow[]>('/departments') : Promise.resolve({ ok: true, data: [] as DeptRow[] }),
    ]);
    setLoadingProjects(false);
    if (!pRes.ok) {
      setError(t('common.loadError', { status: pRes.status }));
      setProjects([]);
      setSelectedProjectId(null);
      setBoard(null);
      return;
    }
    const list = pRes.data ?? [];
    setProjects(list);
    if (dRes.ok && dRes.data) {
      setDepartments(dRes.data);
    }
    const stored = getStoredProjectId();
    const nextId = list.some((p) => p.id === stored) ? stored! : list[0]?.id ?? null;
    setSelectedProjectId(nextId);
    if (nextId) {
      setStoredProjectId(nextId);
    }
  }, [t, canWriteProjects]);

  const loadBoard = useCallback(
    async (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      const boardId = project?.boards[0]?.id;
      if (!boardId) {
        setBoard(null);
        setError(t('kanban.noBoards'));
        return;
      }
      setLoadingBoard(true);
      setError(null);
      const boardRes = await apiJson<BoardPayload>(`/boards/${boardId}`);
      setLoadingBoard(false);
      if (!boardRes.ok || !boardRes.data) {
        setError(t('common.loadError', { status: boardRes.status }));
        setBoard(null);
        return;
      }
      setBoard(boardRes.data);
    },
    [projects, t],
  );

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProjectId && projects.length) {
      void loadBoard(selectedProjectId);
    } else {
      setBoard(null);
    }
  }, [selectedProjectId, projects, loadBoard]);

  function selectProject(id: string) {
    setSelectedProjectId(id);
    setStoredProjectId(id);
  }

  function openCreate() {
    setFormError(null);
    setProjectName('');
    setProjectDescription('');
    setProjectDepartmentId('');
    setShowCreate(true);
  }

  function openEdit() {
    if (!selectedProject) return;
    setFormError(null);
    setProjectName(selectedProject.name);
    setProjectDescription(selectedProject.description ?? '');
    setProjectDepartmentId('');
    setShowEdit(true);
  }

  function closeModals() {
    setShowCreate(false);
    setShowEdit(false);
    setFormError(null);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const name = projectName.trim();
    if (!name) return;
    setSubmitting(true);
    const res = await apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: projectDescription.trim() || undefined,
        departmentId: projectDepartmentId || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('kanban.createFailed')));
      return;
    }
    const created = (await res.json()) as ProjectRow;
    closeModals();
    await loadProjects();
    setSelectedProjectId(created.id);
    setStoredProjectId(created.id);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) return;
    setFormError(null);
    const name = projectName.trim();
    if (!name) return;
    setSubmitting(true);
    const res = await apiFetch(`/projects/${selectedProjectId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name,
        description: projectDescription.trim() || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(await parseApiError(res, t('kanban.editFailed')));
      return;
    }
    closeModals();
    await loadProjects();
  }

  const moveTask = useCallback(
    async (taskId: string, newStatus: string) => {
      if (!board || !canDragTasks) {
        return;
      }
      const sourceCol = board.columns.find((c) => c.tasks.some((t) => t.id === taskId));
      const task = sourceCol?.tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) {
        return;
      }

      const previous = board;
      setBoard(moveTaskInBoard(board, taskId, newStatus));
      setError(null);

      const res = await apiFetch(`/tasks/${taskId}/move`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setBoard(previous);
        setError(await parseApiError(res, t('kanban.moveFailed')));
        return;
      }

      if (selectedProjectId) {
        void loadBoard(selectedProjectId);
      }
    },
    [board, canDragTasks, selectedProjectId, loadBoard, t],
  );

  async function deleteProject() {
    if (!selectedProject) return;
    if (!window.confirm(t('kanban.deleteConfirm', { name: selectedProject.name }))) return;
    setSubmitting(true);
    const res = await apiFetch(`/projects/${selectedProject.id}`, { method: 'DELETE' });
    setSubmitting(false);
    if (!res.ok) {
      setError(await parseApiError(res, t('kanban.deleteFailed')));
      return;
    }
    const remaining = projects.filter((p) => p.id !== selectedProject.id);
    const nextId = remaining[0]?.id ?? null;
    setStoredProjectId(nextId);
    setSelectedProjectId(nextId);
    await loadProjects();
  }

  const emptyProjects = !loadingProjects && projects.length === 0;

  return (
    <div>
      <PageHeader
        title={t('kanban.title')}
        subtitle={
          selectedProject
            ? `${selectedProject.name} · ${t('kanban.subtitleLive')}`
            : t('kanban.subtitle')
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canAddTask && newTaskHref ? (
              <Link
                to={newTaskHref}
                className="flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 text-xs font-bold uppercase text-on-primary-container hover:opacity-90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                {t('nav.newTask')}
              </Link>
            ) : null}
            {canWriteProjects ? (
              <button
                type="button"
                onClick={() => openCreate()}
                className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold uppercase text-on-surface hover:bg-surface-container-low"
              >
                {t('kanban.newProject')}
              </button>
            ) : null}
          </div>
        }
      />

      {loadingProjects ? (
        <p className="text-sm text-on-surface-variant">{t('common.loading')}</p>
      ) : null}

      {emptyProjects ? (
        <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
          <p className="text-sm text-on-surface-variant">{t('kanban.noProjects')}</p>
          {canWriteProjects ? (
            <button
              type="button"
              onClick={() => openCreate()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary"
            >
              {t('kanban.newProject')}
            </button>
          ) : null}
        </div>
      ) : null}

      {projects.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-outline-variant/40 pb-4">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectProject(p.id)}
              className={[
                'rounded-lg px-4 py-2 text-xs font-bold uppercase transition-colors',
                p.id === selectedProjectId
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-low',
              ].join(' ')}
            >
              {p.name}
            </button>
          ))}
          {canWriteProjects && selectedProject ? (
            <div className="ms-auto flex gap-2">
              <button
                type="button"
                onClick={() => openEdit()}
                className="rounded-lg border border-outline-variant px-3 py-2 text-[10px] font-bold uppercase text-on-surface hover:bg-surface-container-low"
              >
                {t('kanban.editProject')}
              </button>
              <button
                type="button"
                onClick={() => void deleteProject()}
                disabled={submitting}
                className="rounded-lg border border-error/40 px-3 py-2 text-[10px] font-bold uppercase text-error hover:bg-error/10 disabled:opacity-50"
              >
                {t('kanban.deleteProject')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {loadingBoard && selectedProjectId ? (
        <p className="mt-4 text-sm text-on-surface-variant">{t('common.loading')}</p>
      ) : null}

      {board && !loadingBoard ? (
        <div className="mt-6 flex gap-6 overflow-x-auto pb-4">
          {STATUS_ORDER.map((status) => {
            const col = board.columns.find((c) => c.status === status);
            const tasks = col?.tasks ?? [];
            return (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasks}
                canDrag={canDragTasks}
                isDragOver={dragOverStatus === status}
                draggingTaskId={draggingTaskId}
                onDragOverColumn={setDragOverStatus}
                onDragStartTask={setDraggingTaskId}
                onDragEndTask={() => {
                  setDraggingTaskId(null);
                  setDragOverStatus(null);
                }}
                onMoveTask={(taskId, targetStatus) => void moveTask(taskId, targetStatus)}
              />
            );
          })}
        </div>
      ) : null}

      {(showCreate || showEdit) && canWriteProjects ? (
        <ProjectModal
          isEdit={showEdit}
          projectName={projectName}
          projectDescription={projectDescription}
          projectDepartmentId={projectDepartmentId}
          departments={departments}
          formError={formError}
          submitting={submitting}
          onClose={closeModals}
          onNameChange={setProjectName}
          onDescriptionChange={setProjectDescription}
          onDepartmentChange={setProjectDepartmentId}
          onSubmit={(e) => void (showEdit ? submitEdit(e) : submitCreate(e))}
        />
      ) : null}
    </div>
  );
}

function ProjectModal({
  isEdit,
  projectName,
  projectDescription,
  projectDepartmentId,
  departments,
  formError,
  submitting,
  onClose,
  onNameChange,
  onDescriptionChange,
  onDepartmentChange,
  onSubmit,
}: {
  isEdit: boolean;
  projectName: string;
  projectDescription: string;
  projectDepartmentId: string;
  departments: DeptRow[];
  formError: string | null;
  submitting: boolean;
  onClose: () => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-on-surface">
          {isEdit ? t('kanban.editProjectTitle') : t('kanban.createProjectTitle')}
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {isEdit ? t('kanban.editProjectSubtitle') : t('kanban.createProjectSubtitle')}
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {formError ? <p className="text-sm text-error">{formError}</p> : null}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
              {t('kanban.projectName')}
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
              {t('kanban.projectDescription')}
            </label>
            <textarea
              rows={3}
              value={projectDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
            />
          </div>
          {!isEdit && departments.length > 0 ? (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                {t('kanban.projectDepartment')}
              </label>
              <select
                value={projectDepartmentId}
                onChange={(e) => onDepartmentChange(e.target.value)}
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
          ) : null}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
                ? t('kanban.saving')
                : isEdit
                  ? t('kanban.saveProject')
                  : t('kanban.createProject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  canDrag,
  isDragOver,
  draggingTaskId,
  onDragOverColumn,
  onDragStartTask,
  onDragEndTask,
  onMoveTask,
}: {
  status: string;
  tasks: BoardTask[];
  canDrag: boolean;
  isDragOver: boolean;
  draggingTaskId: string | null;
  onDragOverColumn: (status: string | null) => void;
  onDragStartTask: (taskId: string) => void;
  onDragEndTask: () => void;
  onMoveTask: (taskId: string, targetStatus: string) => void;
}) {
  const { t } = useTranslation();
  const title = t(`dashboard.status.${status}`, { defaultValue: status });

  function handleDragOver(e: React.DragEvent) {
    if (!canDrag || !draggingTaskId) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOverColumn(status);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    onDragOverColumn(null);
    if (!canDrag) {
      return;
    }
    const taskId = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (taskId) {
      onMoveTask(taskId, status);
    }
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: taskStatusChartColor(status) }}
          aria-hidden
        />
        <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
        <span className="rounded bg-surface-container-highest px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
          {tasks.length}
        </span>
      </div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={() => onDragOverColumn(null)}
        onDrop={handleDrop}
        className={[
          'flex min-h-[420px] flex-col gap-3 rounded-xl border-2 border-dashed p-1 transition-colors',
          isDragOver
            ? 'border-primary bg-primary-container/15'
            : 'border-outline-variant/50',
        ].join(' ')}
      >
        {isDragOver && draggingTaskId ? (
          <p className="px-2 py-1 text-center text-[10px] font-bold uppercase text-primary">
            {t('kanban.dropHere')}
          </p>
        ) : null}
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            canDrag={canDrag}
            isDragging={draggingTaskId === task.id}
            onDragStartTask={onDragStartTask}
            onDragEndTask={onDragEndTask}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  canDrag,
  isDragging,
  onDragStartTask,
  onDragEndTask,
}: {
  task: BoardTask;
  canDrag: boolean;
  isDragging: boolean;
  onDragStartTask: (taskId: string) => void;
  onDragEndTask: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language ?? 'es';
  const navigate = useNavigate();
  const priorityLabel = t(`kanban.priority.${task.priority}`, { defaultValue: task.priority });
  const dueLabel = formatDueDateLabel(task.dueDate, locale);
  const overdue = isDueDateOverdue(task.dueDate, task.status);
  const assetCount = task.taskAssets?.length ?? 0;
  const commentCount = task.comments?.length ?? 0;
  const attachCount = task.attachments?.length ?? 0;
  const subtaskCount = task._count?.subtasks ?? 0;
  const assigneeName = task.assignee
    ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim()
    : null;
  const assigneeInitials = task.assignee
    ? `${task.assignee.firstName?.[0] ?? ''}${task.assignee.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';
  const didDragRef = useRef(false);

  function handleDragStart(e: React.DragEvent) {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStartTask(task.id);
  }

  function handleDragEnd() {
    onDragEndTask();
    didDragRef.current = true;
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 100);
  }

  function handleClick() {
    if (didDragRef.current) {
      return;
    }
    navigate(`/tasks/${task.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/tasks/${task.id}`);
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={canDrag ? `${task.title}. ${t('kanban.dragCard')}` : task.title}
      className={[
        'group flex cursor-pointer overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md',
        canDrag ? 'cursor-grab active:cursor-grabbing' : '',
        isDragging ? 'ring-2 ring-primary shadow-md' : '',
      ].join(' ')}
    >
      <div
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: taskStatusChartColor(task.status) }}
        aria-hidden
      />

      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2.5 gap-y-2 p-3.5">
        <span
          className={`col-span-1 inline-flex w-fit max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${taskPriorityPillClass(task.priority)}`}
        >
          {task.priority === 'CRITICAL' ? (
            <span className="material-symbols-outlined text-sm">priority_high</span>
          ) : null}
          <span className="truncate">{priorityLabel}</span>
        </span>

        <div
          className={[
            'col-span-1 flex min-w-0 items-center justify-end gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold',
            overdue
              ? 'bg-[#ffdad6] text-[#ba1a1a]'
              : 'bg-surface-container-low text-on-surface-variant',
          ].join(' ')}
        >
          <span className="material-symbols-outlined shrink-0 text-sm">calendar_today</span>
          <span className="truncate">{dueLabel ?? t('kanban.noDueDate')}</span>
        </div>

        <h4 className="col-span-2 line-clamp-2 text-sm font-semibold leading-snug text-on-surface">
          {task.title}
        </h4>

        <div className="col-span-2 flex min-w-0 items-center gap-2 border-t border-outline-variant/50 pt-2">
          {assigneeName ? (
            <>
              <Avatar initials={assigneeInitials} className="h-7 w-7 shrink-0 text-[10px]" />
              <span className="min-w-0 truncate text-xs font-medium text-on-surface">{assigneeName}</span>
            </>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase text-on-surface-variant">
              <span className="material-symbols-outlined text-base">groups</span>
              <span className="truncate">{t('kanban.forEveryone')}</span>
            </span>
          )}

          <div className="ms-auto flex shrink-0 items-center gap-1">
            {subtaskCount > 0 ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-md bg-primary-container/40 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                title={t('kanban.subtasksCount', { count: subtaskCount })}
              >
                <span className="material-symbols-outlined text-sm">checklist</span>
                {subtaskCount}
              </span>
            ) : null}
            {commentCount > 0 ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-md bg-surface-container-low px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant"
                title={t('kanban.commentsCount', { count: commentCount })}
              >
                <span className="material-symbols-outlined text-sm">chat_bubble_outline</span>
                {commentCount}
              </span>
            ) : null}
            {attachCount + assetCount > 0 ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-md bg-surface-container-low px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant"
                title={t('kanban.attachmentsCount', { count: attachCount + assetCount })}
              >
                <span className="material-symbols-outlined text-sm">attach_file</span>
                {attachCount + assetCount}
              </span>
            ) : null}
            {canDrag ? (
              <span
                className="material-symbols-outlined text-lg text-outline-variant transition-colors group-hover:text-on-surface-variant"
                aria-hidden
              >
                drag_indicator
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

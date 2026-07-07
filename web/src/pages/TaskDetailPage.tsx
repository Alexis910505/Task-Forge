import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { TaskLocationMiniMap } from '@/components/maps/TaskLocationMiniMap';
import { Avatar } from '@/components/ui/Avatar';
import { apiFetch, apiJson, resolveUploadUrl } from '@/lib/api';
import { canCreateTasks } from '@/lib/projectAccess';
import { formatDueDateLabel, isDueDateOverdue } from '@/lib/dueDates';
import { taskPriorityPillClass, taskStatusPillClass } from '@/lib/taskStatusColors';

type TaskUser = { id: string; firstName: string; lastName: string; email: string };

type TaskAttachment = {
  id: string;
  evidenceKind?: string | null;
  filename: string;
  url: string;
  mimeType?: string;
};

type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  user?: TaskUser | null;
};

type TaskDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  location?: string | null;
  dueDate?: string | null;
  assignee?: TaskUser | null;
  createdBy?: TaskUser | null;
  board?: { id: string; name: string; projectId?: string };
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
};

type TimelineEntry = {
  id: string;
  action: string;
  createdAt: string;
  metadata?: unknown;
  user?: TaskUser | null;
};

function userName(u: TaskUser | null | undefined, fallback: string): string {
  if (!u) return fallback;
  const n = `${u.firstName} ${u.lastName}`.trim();
  return n || u.email;
}

function userInitials(u: TaskUser | null | undefined): string {
  if (!u) return '?';
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || u.email[0]?.toUpperCase() || '?';
}

function isImageAttachment(a: TaskAttachment): boolean {
  const mime = a.mimeType ?? '';
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(a.filename);
}

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffMin = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 48) return rtf.format(diffHr, 'hour');
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

function priorityLabel(priority: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    LOW: t('createTask.priorityLow'),
    MEDIUM: t('createTask.priorityMedium'),
    HIGH: t('createTask.priorityHigh'),
    CRITICAL: t('createTask.priorityCritical'),
  };
  return map[priority] ?? priority;
}

function timelineMessage(action: string, t: (key: string) => string): string {
  const key = `taskDetail.timeline.${action.replace(/\./g, '_')}`;
  const translated = t(key);
  return translated !== key ? translated : action;
}

export function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('es') ? 'es' : 'en';
  const { user } = useAuth();
  const canEdit = canCreateTasks(user?.role?.name);
  const canComment = canEdit;
  const { taskId } = useParams<{ taskId: string }>();
  const id = taskId ?? '';

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [taskRes, tlRes] = await Promise.all([
      apiJson<TaskDetail>(`/tasks/${id}`),
      apiJson<TimelineEntry[]>(`/tasks/${id}/timeline`),
    ]);
    setLoading(false);
    if (!taskRes.ok || !taskRes.data) {
      setError(t('common.loadError', { status: taskRes.status }));
      setTask(null);
      setTimeline([]);
      return;
    }
    setTask(taskRes.data);
    setTimeline(tlRes.ok && Array.isArray(tlRes.data) ? tlRes.data : []);
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const content = commentText.trim();
    if (!content || !id) return;
    setCommentSubmitting(true);
    setCommentError(null);
    const res = await apiFetch(`/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    setCommentSubmitting(false);
    if (!res.ok) {
      setCommentError(t('taskDetail.commentFailed'));
      return;
    }
    setCommentText('');
    await load();
  }

  if (!id) {
    return <p className="text-sm text-error">{t('taskDetail.missingId')}</p>;
  }

  if (loading) {
    return <p className="text-sm text-on-surface-variant">{t('common.loading')}</p>;
  }

  if (error || !task) {
    return (
      <div>
        <p className="text-sm text-error">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold uppercase"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const evidenceItems = (task.attachments ?? []).filter(
    (a) => a.evidenceKind === 'BEFORE' || a.evidenceKind === 'AFTER',
  );
  const fileAttachments = (task.attachments ?? []).filter(
    (a) => a.evidenceKind !== 'BEFORE' && a.evidenceKind !== 'AFTER',
  );
  const comments = [...(task.comments ?? [])].reverse();
  const shortId = task.id.length > 8 ? task.id.slice(0, 8) : task.id;

  return (
    <div>
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        <Link to="/dashboard" className="hover:text-primary">
          {t('common.dashboard')}
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <Link to="/kanban" className="hover:text-primary">
          {t('taskDetail.breadcrumbTasks')}
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-primary">{t('taskDetail.inspectionId', { id: shortId })}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <article className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            <header className="flex flex-col justify-between gap-4 border-b border-outline-variant p-6 sm:flex-row sm:items-start">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-on-surface md:text-[32px] md:leading-10">{task.title}</h1>
                <div className="flex flex-wrap gap-3">
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase ${taskStatusPillClass(task.status)}`}
                  >
                    <span className="material-symbols-outlined text-sm">sync</span>
                    {t(`dashboard.status.${task.status}`, { defaultValue: task.status })}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase ${taskPriorityPillClass(task.priority)}`}
                  >
                    <span className="material-symbols-outlined text-sm">priority_high</span>
                    {priorityLabel(task.priority, t)}
                  </span>
                  {task.location ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {task.location}
                    </span>
                  ) : null}
                </div>
              </div>
              {canEdit ? (
                <div className="flex shrink-0 gap-2">
                  <Link
                    to={`/tasks/${task.id}/edit`}
                    className="rounded-lg border border-outline-variant p-2 text-on-surface transition-colors hover:bg-surface-container"
                    title={t('taskDetail.edit')}
                  >
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </Link>
                </div>
              ) : null}
            </header>

            <section className="p-6">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('taskDetail.description')}
              </h2>
              <p className="max-w-3xl text-base leading-relaxed text-on-surface-variant">
                {task.description?.trim() ? task.description : t('taskDetail.noDescription')}
              </p>
            </section>

            {evidenceItems.length > 0 ? (
              <section className="border-t border-outline-variant bg-surface-container-low/30 p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('taskDetail.evidence')}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {evidenceItems.map((e) => (
                    <EvidencePreview key={e.id} item={e} t={t} />
                  ))}
                </div>
              </section>
            ) : null}

            {fileAttachments.length > 0 ? (
              <section className="border-t border-outline-variant p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('taskDetail.attachments')}
                </h2>
                <ul className="space-y-2">
                  {fileAttachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={resolveUploadUrl(a.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-primary hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-base">attach_file</span>
                        <span className="truncate">{a.filename}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <div className="mb-6 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-on-surface">{t('taskDetail.communicationThread')}</h2>
              {comments.length > 0 ? (
                <span className="rounded-full bg-primary-container px-2 py-0.5 text-xs font-bold text-on-primary-container">
                  {comments.length}
                </span>
              ) : null}
            </div>

            {comments.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t('taskDetail.noComments')}</p>
            ) : (
              <ul className="space-y-6">
                {comments.map((c) => {
                  const who = userName(c.user, t('taskDetail.system'));
                  const isSelf = user?.id === c.user?.id;
                  return (
                    <li key={c.id} className="flex gap-4">
                      <Avatar initials={userInitials(c.user)} className="h-10 w-10 text-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-on-surface">{who}</span>
                          <span className="text-sm text-on-surface-variant">
                            · {formatWhen(c.createdAt, locale)}
                          </span>
                        </div>
                        <p
                          className={[
                            'rounded-xl border p-4 text-base leading-relaxed',
                            isSelf
                              ? 'rounded-tl-none border-primary/20 bg-primary-container/10 text-on-surface'
                              : 'rounded-tl-none border-outline-variant/30 bg-surface-container-low text-on-surface-variant',
                          ].join(' ')}
                        >
                          {c.content}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {canComment ? (
              <form
                onSubmit={(ev) => void submitComment(ev)}
                className="mt-8 border-t border-outline-variant pt-6"
              >
                {commentError ? <p className="mb-2 text-sm text-error">{commentError}</p> : null}
                <div className="relative">
                  <textarea
                    value={commentText}
                    onChange={(ev) => setCommentText(ev.target.value)}
                    rows={2}
                    placeholder={t('taskDetail.commentPlaceholder')}
                    className="w-full resize-none rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 pe-12 text-base outline-none ring-primary focus:ring-2"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || !commentText.trim()}
                    className="absolute bottom-2.5 end-3 rounded-md p-1 text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                    aria-label={t('taskDetail.addComment')}
                  >
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t('taskDetail.assignmentDetails')}
            </h2>
            <dl className="space-y-6">
              <MetaRow icon="person" label={t('taskDetail.assignedTo')}>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar initials={userInitials(task.assignee)} className="h-6 w-6 text-[10px]" />
                    <span className="text-xs font-bold text-on-surface">{userName(task.assignee, '')}</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">groups</span>
                    {t('taskDetail.forEveryone')}
                  </span>
                )}
              </MetaRow>
              <MetaRow icon="event" label={t('taskDetail.dueDate')}>
                <span
                  className={`text-xs font-bold ${
                    task.dueDate && isDueDateOverdue(task.dueDate, task.status)
                      ? 'text-error'
                      : task.dueDate
                        ? 'text-on-surface'
                        : 'text-on-surface-variant'
                  }`}
                >
                  {task.dueDate
                    ? (formatDueDateLabel(task.dueDate, locale) ?? t('taskDetail.noDueDate'))
                    : t('taskDetail.noDueDate')}
                </span>
              </MetaRow>
              {task.board?.name ? (
                <MetaRow icon="folder" label={t('taskDetail.project')}>
                  <span className="text-xs font-bold text-on-surface">{task.board.name}</span>
                </MetaRow>
              ) : null}
            </dl>

            {task.location ? (
              <div className="mt-8 rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">map</span>
                  <span className="text-xs font-bold text-on-surface">{t('taskDetail.preciseLocation')}</span>
                </div>
                <TaskLocationMiniMap location={task.location} />
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t('taskDetail.activity')}
            </h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t('taskDetail.noActivity')}</p>
            ) : (
              <ul className="relative space-y-6 before:absolute before:bottom-2 before:start-[11px] before:top-2 before:w-px before:bg-outline-variant/30">
                {timeline.map((entry, idx) => {
                  const who = userName(entry.user, t('taskDetail.system'));
                  const isRecent = idx === 0;
                  return (
                    <li key={entry.id} className="relative ps-8">
                      <span
                        className={[
                          'absolute start-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-4 border-surface-container-lowest',
                          isRecent ? 'bg-primary-container/20' : 'bg-outline-variant/20',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'h-2 w-2 rounded-full',
                            isRecent ? 'bg-primary' : 'bg-outline-variant',
                          ].join(' ')}
                        />
                      </span>
                      <p className="text-sm text-on-surface">
                        <span className="font-bold">{who}</span>{' '}
                        <span className="text-on-surface-variant">
                          {timelineMessage(entry.action, t)}
                        </span>
                      </p>
                      <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">
                        {formatWhen(entry.createdAt, locale)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-6 text-xs text-on-surface-variant">{t('taskDetail.evidenceMobileHint')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-surface-container p-2">
          <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
        </div>
        <span className="text-base text-on-surface-variant">{label}</span>
      </div>
      <div className="shrink-0 text-end">{children}</div>
    </div>
  );
}

function EvidencePreview({
  item,
  t,
}: {
  item: TaskAttachment;
  t: (key: string) => string;
}) {
  const heading =
    item.evidenceKind?.toUpperCase() === 'BEFORE'
      ? t('taskDetail.before')
      : item.evidenceKind?.toUpperCase() === 'AFTER'
        ? t('taskDetail.after')
        : item.filename;
  const href = resolveUploadUrl(item.url);
  const image = isImageAttachment(item);

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase text-on-surface-variant">{heading}</p>
      {image ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="group relative block aspect-video overflow-hidden rounded-lg border border-outline-variant bg-surface-container"
        >
          <img
            src={href}
            alt={item.filename}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="material-symbols-outlined text-[32px] text-white">zoom_in</span>
          </div>
        </a>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-high p-4 text-sm text-primary underline"
        >
          <span className="material-symbols-outlined text-3xl">description</span>
          {item.filename}
        </a>
      )}
    </div>
  );
}

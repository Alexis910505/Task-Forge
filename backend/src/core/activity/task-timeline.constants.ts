/** Acciones del historial de tarea (timeline estilo GitHub). */
export function timelineSnippet(text: string | null | undefined, max = 200): string | null {
  if (text == null || text === '') {
    return null;
  }
  const s = String(text);
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max)}…`;
}

export const TaskTimelineAction = {
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_UNASSIGNED: 'task.unassigned',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_COMPLETED: 'task.completed',
  TASK_REOPENED: 'task.reopened',
  TASK_PRIORITY_CHANGED: 'task.priority_changed',
  TASK_TITLE_CHANGED: 'task.title_changed',
  TASK_DESCRIPTION_CHANGED: 'task.description_changed',
  TASK_LOCATION_CHANGED: 'task.location_changed',
  TASK_DUE_DATE_CHANGED: 'task.due_date_changed',
  TASK_SORT_ORDER_CHANGED: 'task.sort_order_changed',
  TASK_ASSETS_LINKED: 'task.assets_linked',
  TASK_ASSET_UNLINKED: 'task.asset_unlinked',
  TASK_SUBTASK_CREATED: 'task.subtask_created',
  COMMENT_ADDED: 'comment.added',
  ATTACHMENT_ADDED: 'attachment.added',
} as const;

export type TaskTimelineActionType = (typeof TaskTimelineAction)[keyof typeof TaskTimelineAction];

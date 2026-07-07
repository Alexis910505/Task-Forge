export type NotificationTypeKey =
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'COMMENT'
  | 'MENTION'
  | 'SYSTEM';

export type NotificationMetadata = {
  taskId?: string;
  commentId?: string;
  taskTitle?: string;
  threadTitle?: string;
  status?: string;
  actorName?: string;
};

export function parseNotificationMetadata(raw: unknown): NotificationMetadata {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  return {
    taskId: typeof o.taskId === 'string' ? o.taskId : undefined,
    commentId: typeof o.commentId === 'string' ? o.commentId : undefined,
    taskTitle: typeof o.taskTitle === 'string' ? o.taskTitle : undefined,
    threadTitle: typeof o.threadTitle === 'string' ? o.threadTitle : undefined,
    status: typeof o.status === 'string' ? o.status : undefined,
    actorName: typeof o.actorName === 'string' ? o.actorName : undefined,
  };
}

/** Iconos alineados con tarjetas de equipos/departamentos (secondary-container). */
export function notificationVisual(type: NotificationTypeKey): {
  icon: string;
  iconClass: string;
} {
  switch (type) {
    case 'TASK_ASSIGNED':
      return {
        icon: 'assignment',
        iconClass: 'bg-primary-container text-on-primary-container',
      };
    case 'TASK_UPDATED':
      return {
        icon: 'task_alt',
        iconClass: 'bg-tertiary-container/40 text-tertiary',
      };
    case 'COMMENT':
      return {
        icon: 'chat_bubble',
        iconClass: 'bg-secondary-container text-on-secondary-container',
      };
    case 'MENTION':
      return {
        icon: 'alternate_email',
        iconClass: 'bg-secondary-container text-on-secondary-container',
      };
    case 'SYSTEM':
    default:
      return {
        icon: 'info',
        iconClass: 'bg-error-container text-on-error-container',
      };
  }
}

export function notificationTypeLabel(type: NotificationTypeKey, t: (k: string) => string): string {
  const key = `notifications.types.${type}`;
  const label = t(key);
  return label === key ? type : label;
}

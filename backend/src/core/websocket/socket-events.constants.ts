/** Nombres de eventos Socket.IO (namespace `/events`). */
export const SocketEvents = {
  /** Nueva tarea (sala board + org). */
  TASK_CREATED: 'task.created',
  /** Cambio de estado de tarea. */
  TASK_STATUS_CHANGED: 'task.status_changed',
  /** Asignación / desasignación. */
  TASK_ASSIGNED: 'task.assigned',
  /** Nuevo comentario en una tarea. */
  COMMENT_CREATED: 'comment.created',
  /** Notificación persistida para un usuario (sala user). */
  NOTIFICATION: 'notification',
  /** Movimiento Kanban (estado y/o orden en tablero). */
  KANBAN_CARD_MOVED: 'kanban.card_moved',
  /** Cambio genérico que implica refrescar tablero (compat). */
  TASK_UPDATED_LEGACY: 'task.updated',
  /** Sugerencia ligera para refrescar dashboard/resumen. */
  DASHBOARD_REFRESH: 'dashboard.refresh',
} as const;

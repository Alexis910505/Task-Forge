/** Colores por estado de tarea (gráficos y chips). */
export const TASK_STATUS_ORDER = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as const;

export type TaskStatusKey = (typeof TASK_STATUS_ORDER)[number];

const STATUS_CHART: Record<TaskStatusKey, string> = {
  BACKLOG: '#9e9ea8',
  TODO: '#d97706',
  IN_PROGRESS: '#4744e5',
  REVIEW: '#7c3aed',
  COMPLETED: '#006d2e',
};

const STATUS_PILL: Record<TaskStatusKey, string> = {
  BACKLOG: 'bg-[#e8e8ec] text-[#464555]',
  TODO: 'bg-amber-100 text-amber-950',
  IN_PROGRESS: 'bg-[#e2e1ff] text-[#4744e5]',
  REVIEW: 'bg-violet-100 text-violet-950',
  COMPLETED: 'bg-emerald-100 text-emerald-950',
};

export function taskStatusChartColor(status: string): string {
  return STATUS_CHART[status as TaskStatusKey] ?? '#c7c4d8';
}

export function taskStatusPillClass(status: string): string {
  return STATUS_PILL[status as TaskStatusKey] ?? 'bg-surface-container-high text-on-surface-variant';
}

/** Prioridad: crítica en rojo (sin cambiar); el resto con color propio. */
export function taskPriorityPillClass(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-[#ffdad6] text-[#ba1a1a]';
    case 'HIGH':
      return 'bg-orange-100 text-orange-950';
    case 'MEDIUM':
      return 'bg-sky-100 text-sky-950';
    case 'LOW':
      return 'bg-[#e8e8ec] text-[#464555]';
    default:
      return 'bg-surface-container-high text-on-surface-variant';
  }
}

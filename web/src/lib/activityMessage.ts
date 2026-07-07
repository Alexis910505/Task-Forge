import type { TFunction } from 'i18next';

type ActivityEntry = {
  action: string;
  task?: { id: string; title: string } | null;
  metadata?: unknown;
};

export function activityTimelineMessage(entry: ActivityEntry, t: TFunction): string {
  const key = `taskDetail.timeline.${entry.action.replace(/\./g, '_')}`;
  const verb = t(key);
  const translated = verb !== key ? verb : entry.action;
  const title = entry.task?.title?.trim();
  if (!title) return translated;
  return `${translated} ${title}`;
}

export function activityIcon(action: string): { icon: string; className: string } {
  if (action.includes('completed')) {
    return { icon: 'check_circle', className: 'text-tertiary' };
  }
  if (action.includes('comment')) {
    return { icon: 'chat_bubble', className: 'text-primary' };
  }
  if (action.includes('attachment')) {
    return { icon: 'attach_file', className: 'text-on-surface-variant' };
  }
  if (action.includes('assigned') || action.includes('priority') || action.includes('status')) {
    return { icon: 'warning', className: 'text-error' };
  }
  return { icon: 'bolt', className: 'text-primary' };
}

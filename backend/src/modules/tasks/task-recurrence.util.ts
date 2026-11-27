import { TaskRecurrence } from '@prisma/client';

/** Suma meses sin desbordar: 31 ene + 1 mes = 28/29 feb (no 3 mar). */
function addMonthsClamped(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * Momento en que aparece la siguiente ocurrencia, contado desde que se completó la tarea.
 * Ej.: completada el lunes a las 18:00 con repetición diaria → nueva tarea el martes a las 18:00.
 */
export function nextOccurrenceDate(completedAt: Date, recurrence: TaskRecurrence): Date {
  switch (recurrence) {
    case TaskRecurrence.DAILY:
      return new Date(completedAt.getTime() + 24 * 60 * 60 * 1000);
    case TaskRecurrence.WEEKLY:
      return new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    case TaskRecurrence.MONTHLY:
      return addMonthsClamped(completedAt, 1);
    case TaskRecurrence.YEARLY:
      return addMonthsClamped(completedAt, 12);
  }
}

/** Persiste el instante UTC recibido (ISO) sin reinterpretar el día de calendario. */
export function normalizeDueDate(value: string | Date): Date {
  const parsed = typeof value === 'string' ? new Date(value.trim()) : value;
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid due date');
  }
  return parsed;
}

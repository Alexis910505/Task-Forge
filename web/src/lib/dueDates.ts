/**
 * Fechas límite: la API persiste ISO UTC; el cliente convierte a la zona horaria local.
 */

export function todayLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD del input → fin de ese día en hora local, serializado en UTC (ISO). */
export function localDateInputToApiIso(dateOnly: string): string | undefined {
  const trimmed = dateOnly.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const localEndOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
  return localEndOfDay.toISOString();
}

/** ISO UTC de la API → YYYY-MM-DD en la zona horaria del cliente (input type=date). */
export function apiIsoToLocalDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Etiqueta legible en la zona horaria local del cliente. */
export function formatDueDateLabel(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale.startsWith('es') ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function isDueDateOverdue(iso: string | null | undefined, status: string): boolean {
  if (!iso || status === 'COMPLETED') return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

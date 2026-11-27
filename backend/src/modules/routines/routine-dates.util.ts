/**
 * Fechas de rutina como texto YYYY-MM-DD en la zona del usuario.
 * El cliente envía su fecha local; aquí solo se suman días y se calcula el día de la semana,
 * siempre en UTC para que no influya la zona horaria del servidor.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function parse(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  return new Date(parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 1 = lunes … 7 = domingo. */
export function isoWeekday(date: string): number {
  return ((new Date(parse(date)).getUTCDay() + 6) % 7) + 1;
}

export function utcDateOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isValidDate(date: string): boolean {
  const ms = parse(date);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === date;
}

/**
 * La fecha local de cualquier zona horaria está a lo sumo un día del UTC actual.
 * Se permite ±1 día (más margen) para no aceptar marcas en días pasados o futuros.
 */
export function isPlausibleToday(date: string, now = new Date()): boolean {
  if (!isValidDate(date)) return false;
  const diffDays = Math.abs(parse(date) - parse(utcDateOf(now))) / DAY_MS;
  return diffDays <= 1;
}

export type TimezoneOption = { value: string; label: string };

/** Zonas IANA de respaldo si el navegador no expone `Intl.supportedValuesOf`. */
const FALLBACK_TIMEZONES = [
  'UTC',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Lima',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Rome',
  'Pacific/Auckland',
];

function getIanaTimezones(): string[] {
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      const list = (
        Intl as typeof Intl & { supportedValuesOf(key: string): string[] }
      ).supportedValuesOf('timeZone');
      if (list.length > 0) {
        return [...list];
      }
    }
  } catch {
    /* ignore */
  }
  return [...FALLBACK_TIMEZONES];
}

/** Etiqueta legible con desplazamiento UTC (p. ej. «UTC+1 · Europe/Madrid»). */
export function formatTimezoneLabel(timeZone: string, locale: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
    const name = timeZone.replace(/_/g, ' ');
    return `${offset} · ${name}`;
  } catch {
    return timeZone.replace(/_/g, ' ');
  }
}

const cache = new Map<string, TimezoneOption[]>();

export function listTimezoneOptions(locale: string): TimezoneOption[] {
  const loc = locale.startsWith('es') ? 'es' : 'en';
  const hit = cache.get(loc);
  if (hit) {
    return hit;
  }

  const zones = getIanaTimezones().sort((a, b) => a.localeCompare(b, 'en'));
  const options = zones.map((value) => ({
    value,
    label: formatTimezoneLabel(value, loc),
  }));

  options.sort((a, b) => a.label.localeCompare(b.label, loc, { numeric: true }));
  cache.set(loc, options);
  return options;
}

/** Asegura que un valor guardado aparezca en el desplegable aunque no esté en IANA. */
export function timezoneOptionsIncluding(
  locale: string,
  current?: string,
): TimezoneOption[] {
  const base = listTimezoneOptions(locale);
  if (!current || base.some((o) => o.value === current)) {
    return base;
  }
  return [{ value: current, label: formatTimezoneLabel(current, locale) }, ...base];
}

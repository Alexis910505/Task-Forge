export type Coords = { lng: number; lat: number };

/** Formato guardado al elegir punto en el mapa: `lat, lng`. */
export function parseCoords(value: string): Coords | null {
  const m = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lng, lat };
}

export function formatCoords({ lng, lat }: Coords): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

import { useEffect, useState } from 'react';
import { apiPath } from '@/lib/api';
import { getClientId } from '@/lib/clientSession';

export const ORGANIZATION_SLUG =
  (typeof import.meta.env.VITE_ORGANIZATION_SLUG === 'string' && import.meta.env.VITE_ORGANIZATION_SLUG.trim()) ||
  'default';

/** ¿Está activado «Entrar con Microsoft» en el servidor? */
export function useMicrosoftEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(apiPath('/auth/providers'))
      .then((r) => (r.ok ? r.json() : { microsoft: false }))
      .then((d: { microsoft?: boolean }) => alive && setEnabled(Boolean(d.microsoft)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}

/** Lleva al usuario a la página de Microsoft (vuelve a /auth/callback). */
export function startMicrosoftSignIn(invite?: string) {
  const q = new URLSearchParams({
    org: ORGANIZATION_SLUG,
    platform: 'web',
    clientId: getClientId(),
    ...(invite ? { invite } : {}),
  });
  window.location.assign(apiPath(`/auth/microsoft/start?${q.toString()}`));
}

/** Códigos de error que devuelve la API tras volver de Microsoft. */
export const MS_ERROR_CODES = [
  'cancelled',
  'session',
  'not_registered',
  'invite_mismatch',
  'invite_invalid',
  'other_account',
  'tenant',
  'failed',
] as const;

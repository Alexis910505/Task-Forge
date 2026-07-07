const CLIENT_ID_KEY = 'tf_client_id';

/** Identificador estable por navegador para sesiones concurrentes web/móvil. */
export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function clientSessionPayload(): { clientId: string; platform: 'web' } {
  return { clientId: getClientId(), platform: 'web' };
}

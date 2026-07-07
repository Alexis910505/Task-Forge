/** Base del API: `VITE_API_URL` absoluto, o `/api` (proxy Vite → Nest en dev). */
/** URL absoluta para ficheros en `/uploads` del backend. */
export function resolveUploadUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = import.meta.env.VITE_API_URL;
  if (base != null && String(base).trim() !== '') {
    return `${String(base).replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = import.meta.env.VITE_API_URL;
  if (base != null && String(base).trim() !== '') {
    return `${String(base).replace(/\/$/, '')}${p}`;
  }
  return `/api${p}`;
}

const ACCESS = 'tf_access';
const REFRESH = 'tf_refresh';

export function getStoredTokens(): { access: string | null; refresh: string | null } {
  return {
    access: localStorage.getItem(ACCESS),
    refresh: localStorage.getItem(REFRESH),
  };
}

export function setStoredTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

const REFRESH_LOCK = 'tf_refresh_lock';
const REFRESH_LOCK_MAX_MS = 15_000;

let refreshInFlight: Promise<boolean> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForPeerRefresh(previousAccess: string | null): Promise<boolean> {
  const deadline = Date.now() + REFRESH_LOCK_MAX_MS;
  while (Date.now() < deadline) {
    const lock = localStorage.getItem(REFRESH_LOCK);
    if (!lock) {
      const { access } = getStoredTokens();
      return Boolean(access && access !== previousAccess);
    }
    await sleep(150);
  }
  return false;
}

async function performRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH);
  if (!refresh) {
    return false;
  }

  const previousAccess = localStorage.getItem(ACCESS);
  const existingLock = localStorage.getItem(REFRESH_LOCK);
  if (existingLock) {
    const waited = await waitForPeerRefresh(previousAccess);
    if (waited) {
      return true;
    }
  }

  const lockId = crypto.randomUUID();
  localStorage.setItem(REFRESH_LOCK, lockId);
  try {
    const res = await fetch(apiPath('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (data.accessToken && data.refreshToken) {
      setStoredTokens(data.accessToken, data.refreshToken);
      return true;
    }
    return false;
  } finally {
    if (localStorage.getItem(REFRESH_LOCK) === lockId) {
      localStorage.removeItem(REFRESH_LOCK);
    }
  }
}

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Petición autenticada con reintento tras refresh. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const { access } = getStoredTokens();
  if (access) {
    headers.set('Authorization', `Bearer ${access}`);
  }
  if (!headers.has('Content-Type') && init.body != null && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(apiPath(path), { ...init, headers });
  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const h2 = new Headers(init.headers);
      const a = getStoredTokens().access;
      if (a) {
        h2.set('Authorization', `Bearer ${a}`);
      }
      if (!h2.has('Content-Type') && init.body != null && typeof init.body === 'string') {
        h2.set('Content-Type', 'application/json');
      }
      res = await fetch(apiPath(path), { ...init, headers: h2 });
    }
  }
  return res;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data?: T; raw: string }> {
  const res = await apiFetch(path, init);
  const raw = await res.text();
  if (!raw) {
    return { ok: res.ok, status: res.status, raw: '' };
  }
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(raw) as T, raw };
  } catch {
    return { ok: res.ok, status: res.status, raw };
  }
}

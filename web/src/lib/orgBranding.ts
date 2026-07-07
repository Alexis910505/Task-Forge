import { apiFetch } from '@/lib/api';

export type OrgBrandingKind = 'logo' | 'favicon';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const ALLOWED_EXT = /\.(png|jpe?g|webp|svg)$/i;

export const MAX_ORG_LOGO_BYTES = 5 * 1024 * 1024;
export const MAX_ORG_FAVICON_BYTES = 1 * 1024 * 1024;

export function isAllowedBrandingFile(file: File, kind: OrgBrandingKind): boolean {
  const max = kind === 'logo' ? MAX_ORG_LOGO_BYTES : MAX_ORG_FAVICON_BYTES;
  if (file.size > max) {
    return false;
  }
  if (ALLOWED_MIME.has(file.type)) {
    return true;
  }
  return ALLOWED_EXT.test(file.name);
}

export async function uploadOrgBranding(
  kind: OrgBrandingKind,
  file: File,
): Promise<{ ok: boolean; status: number; message?: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch(`/organizations/current/branding/${kind}`, {
    method: 'POST',
    body: form,
  });
  if (res.ok) {
    return { ok: true, status: res.status };
  }
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
  return { ok: false, status: res.status, message: msg };
}

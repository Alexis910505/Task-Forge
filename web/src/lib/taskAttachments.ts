import { apiFetch } from '@/lib/api';

export const MAX_TASK_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXT = /\.(pdf|jpe?g|png|webp|docx)$/i;

export function isAllowedTaskAttachment(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) {
    return true;
  }
  return ALLOWED_EXT.test(file.name);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadTaskAttachment(
  taskId: string,
  file: File,
): Promise<{ ok: boolean; status: number; message?: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch(`/tasks/${taskId}/attachments/file`, {
    method: 'POST',
    body: form,
  });
  if (res.ok) {
    return { ok: true, status: res.status };
  }
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  let msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
  if (msg && /expected to be less than|file too large|maxSize/i.test(msg)) {
    msg = undefined;
  }
  return { ok: false, status: res.status, message: msg };
}

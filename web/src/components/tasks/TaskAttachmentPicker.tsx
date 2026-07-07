import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatFileSize,
  isAllowedTaskAttachment,
  MAX_TASK_ATTACHMENT_BYTES,
} from '@/lib/taskAttachments';

export type PendingAttachment = {
  id: string;
  file: File;
};

type TaskAttachmentPickerProps = {
  value: PendingAttachment[];
  onChange: (files: PendingAttachment[]) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
};

function newId() {
  return crypto.randomUUID();
}

export function TaskAttachmentPicker({ value, onChange, onError, disabled }: TaskAttachmentPickerProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) {
      return;
    }
    onError(null);
    const next = [...value];
    for (const file of incoming) {
      if (file.size > MAX_TASK_ATTACHMENT_BYTES) {
        onError(t('createTask.fileTooLarge', { name: file.name }));
        continue;
      }
      if (!isAllowedTaskAttachment(file)) {
        onError(t('createTask.fileTypeNotAllowed', { name: file.name }));
        continue;
      }
      next.push({ id: newId(), file });
    }
    onChange(next);
  }

  function remove(id: string) {
    onChange(value.filter((f) => f.id !== id));
    onError(null);
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {t('createTask.attachments')}
      </label>
      <div
        className={[
          'rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low/40 p-8 text-center transition-colors',
          disabled ? 'pointer-events-none opacity-50' : 'hover:border-primary/50 hover:bg-surface-container-low',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) {
            return;
          }
          addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) {
              addFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
        <label
          htmlFor={inputId}
          className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        >
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
            <span className="material-symbols-outlined text-3xl">cloud_upload</span>
          </span>
          <p className="text-sm font-semibold text-on-surface">{t('createTask.uploadTitle')}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{t('createTask.uploadHint')}</p>
        </label>
      </div>

      {value.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {value.map(({ id, file }) => (
            <li
              key={id}
              className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="material-symbols-outlined shrink-0 text-base text-on-surface-variant">
                  attach_file
                </span>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium text-on-surface">{file.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(id)}
                className="shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase text-error hover:bg-error/10 disabled:opacity-50"
              >
                {t('createTask.removeFile')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

type DescriptionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const next = textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);
  const cursor = start + before.length + selected.length + after.length;
  return { next, cursor, selectionStart: start + before.length, selectionEnd: start + before.length + selected.length };
}

export function DescriptionEditor({ value, onChange, rows = 5 }: DescriptionEditorProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyWrap(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const { next, cursor, selectionStart, selectionEnd } = wrapSelection(el, before, after);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        selectionStart === selectionEnd ? cursor : selectionStart,
        selectionEnd,
      );
    });
  }

  function applyPrefix(prefix: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = el.value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = el.value.indexOf('\n', start);
    const end = lineEnd === -1 ? el.value.length : lineEnd;
    const line = el.value.slice(lineStart, end);
    const stripped = line.replace(/^\s*[-*]\s+/, '');
    const nextLine = line.trimStart().startsWith('-') ? stripped : `${prefix}${stripped}`;
    const next = el.value.slice(0, lineStart) + nextLine + el.value.slice(end);
    onChange(next);
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {t('createTask.description')}
      </label>
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface">
        <div className="flex flex-wrap gap-1 border-b border-outline-variant bg-surface-container-low px-2 py-1.5">
          {[
            { icon: 'format_bold', action: () => applyWrap('**', '**'), label: t('createTask.fmtBold') },
            { icon: 'format_italic', action: () => applyWrap('_', '_'), label: t('createTask.fmtItalic') },
            { icon: 'format_list_bulleted', action: () => applyPrefix('- '), label: t('createTask.fmtList') },
            { icon: 'link', action: () => applyWrap('[', '](url)'), label: t('createTask.fmtLink') },
          ].map((btn) => (
            <button
              key={btn.icon}
              type="button"
              title={btn.label}
              onClick={btn.action}
              className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            >
              <span className="material-symbols-outlined text-xl">{btn.icon}</span>
            </button>
          ))}
        </div>
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          placeholder={t('createTask.descPh')}
          className="w-full resize-y border-0 bg-transparent p-4 text-base outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}

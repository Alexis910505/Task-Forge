import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@/lib/api';

export type AssetCatalogItem = {
  id: string;
  code: string;
  name: string;
  color: string;
  icon?: string;
  isDefault: boolean;
  sortOrder: number;
  assetCount: number;
};

type CatalogKind = 'categories' | 'statuses';

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (typeof data.message === 'string' && data.message.trim()) return data.message;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function AssetCatalogPanel({
  kind,
  rows,
  canWrite,
  onChanged,
}: {
  kind: CatalogKind;
  rows: AssetCatalogItem[];
  canWrite: boolean;
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<AssetCatalogItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6750A4');
  const [icon, setIcon] = useState('inventory_2');
  const [sortOrder, setSortOrder] = useState(0);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const singular = kind === 'categories' ? 'category' : 'status';
  const modalOpen = showCreate || editing != null;

  function openCreate() {
    setEditing(null);
    setCode('');
    setName('');
    setColor('#6750A4');
    setIcon('inventory_2');
    setSortOrder((rows.at(-1)?.sortOrder ?? 0) + 10);
    setIsDefault(rows.length === 0);
    setError(null);
    setShowCreate(true);
  }

  function openEdit(row: AssetCatalogItem) {
    setEditing(row);
    setCode(row.code);
    setName(row.name);
    setColor(row.color);
    setIcon(row.icon ?? 'inventory_2');
    setSortOrder(row.sortOrder);
    setIsDefault(row.isDefault);
    setError(null);
    setShowCreate(false);
  }

  function closeModal() {
    setEditing(null);
    setShowCreate(false);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const base = `/assets/catalog/${kind}`;
    const body = {
      ...(editing ? {} : { code: code.trim().toUpperCase().replace(/\s+/g, '_') }),
      name: name.trim(),
      color,
      ...(kind === 'categories' ? { icon: icon.trim() || 'inventory_2' } : {}),
      sortOrder,
      isDefault,
    };
    const res = await apiFetch(editing ? `${base}/${editing.id}` : base, {
      method: editing ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(await parseApiError(res, t('assets.catalogSaveFailed')));
      return;
    }
    closeModal();
    await onChanged();
  }

  async function remove(row: AssetCatalogItem) {
    if (!window.confirm(t('assets.catalogDeleteConfirm', { name: row.name }))) return;
    setError(null);
    const res = await apiFetch(`/assets/catalog/${kind}/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(await parseApiError(res, t('assets.catalogDeleteFailed')));
      return;
    }
    await onChanged();
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-on-surface">
            {t(`assets.${kind}Title`)}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t(`assets.${kind}Hint`)}
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary"
          >
            {t(`assets.add${singular === 'category' ? 'Category' : 'Status'}`)}
          </button>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-sm text-error">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className="flex min-h-44 flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: row.color }}
                >
                  <span className="material-symbols-outlined">
                    {kind === 'categories' ? row.icon || 'inventory_2' : 'circle'}
                  </span>
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-on-surface">{row.name}</h3>
                  <p className="font-mono text-[11px] text-on-surface-variant">{row.code}</p>
                </div>
              </div>
              {row.isDefault ? (
                <span className="rounded-full bg-primary-container px-2 py-1 text-[9px] font-bold uppercase text-on-primary-container">
                  {t('assets.default')}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">{row.assetCount}</p>
                <p className="text-xs text-on-surface-variant">{t('assets.assignedAssets')}</p>
              </div>
              <p className="text-[10px] text-on-surface-variant">
                {t('assets.sortOrder')}: {row.sortOrder}
              </p>
            </div>
            {canWrite ? (
              <div className="mt-auto flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="flex-1 rounded-lg border border-outline-variant py-2 text-xs font-bold uppercase hover:border-primary hover:text-primary"
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(row)}
                  disabled={row.isDefault || row.assetCount > 0}
                  className="rounded-lg border border-error/30 px-3 py-2 text-xs font-bold uppercase text-error hover:bg-error-container/30 disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    row.isDefault
                      ? t('assets.cannotDeleteDefault')
                      : row.assetCount > 0
                        ? t('assets.cannotDeleteInUse')
                        : t('assets.delete')
                  }
                >
                  {t('assets.delete')}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <h2 className="text-lg font-bold text-on-surface">
              {editing
                ? t(`assets.edit${singular === 'category' ? 'Category' : 'Status'}`)
                : t(`assets.add${singular === 'category' ? 'Category' : 'Status'}`)}
            </h2>
            <form className="mt-5 space-y-4" onSubmit={(e) => void submit(e)}>
              {error ? <p className="text-sm text-error">{error}</p> : null}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('assets.nameLabel')}
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('assets.codeLabel')}
                </label>
                <input
                  required
                  disabled={Boolean(editing)}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  pattern="[A-Z0-9_]+"
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 font-mono text-sm uppercase outline-none ring-primary focus:ring-2 disabled:opacity-60"
                />
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {t('assets.codeImmutableHint')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('assets.color')}
                  </label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-11 w-full rounded-lg border border-outline-variant bg-surface p-1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('assets.sortOrder')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                  />
                </div>
              </div>
              {kind === 'categories' ? (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('assets.icon')}
                  </label>
                  <input
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="inventory_2"
                    className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                  />
                </div>
              ) : null}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="size-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="text-sm text-on-surface">{t('assets.makeDefault')}</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-outline-variant py-3 text-sm font-bold uppercase"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold uppercase text-on-primary disabled:opacity-50"
                >
                  {submitting ? t('common.saving') : t('assets.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

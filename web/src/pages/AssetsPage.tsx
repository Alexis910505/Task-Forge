import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import {
  AssetCatalogPanel,
  type AssetCatalogItem,
} from '@/components/assets/AssetCatalogPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiFetch, apiJson } from '@/lib/api';
import { userHasPermission } from '@/lib/rolePermissions';

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

type AssetRow = {
  id: string;
  name: string;
  code: string;
  category: string;
  status: string;
  location?: string | null;
  maintenanceDate?: string | null;
  _count?: { taskLinks: number; photos: number };
};

type ModalMode = 'create' | 'edit' | null;
type TabKey = 'assets' | 'categories' | 'statuses';

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function AssetsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Inventario: todos los roles con assets:write pueden gestionar (y por política todos lo tienen).
  const canWrite = userHasPermission(user, 'assets:write');

  const [tab, setTab] = useState<TabKey>('assets');
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [categories, setCategories] = useState<AssetCatalogItem[]>([]);
  const [statuses, setStatuses] = useState<AssetCatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');

  const loadCatalogs = useCallback(async () => {
    const [categoryRes, statusRes] = await Promise.all([
      apiJson<AssetCatalogItem[]>('/assets/catalog/categories'),
      apiJson<AssetCatalogItem[]>('/assets/catalog/statuses'),
    ]);
    if (categoryRes.ok) setCategories(categoryRes.data ?? []);
    if (statusRes.ok) setStatuses(statusRes.data ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set('category', filterCategory);
    if (filterStatus) params.set('status', filterStatus);
    if (search.trim()) params.set('q', search.trim());
    const qs = params.toString();
    const [res] = await Promise.all([
      apiJson<AssetRow[]>(`/assets${qs ? `?${qs}` : ''}`),
      loadCatalogs(),
    ]);
    setLoading(false);
    if (!res.ok) {
      setError(t('common.loadError', { status: res.status }));
      setRows([]);
      return;
    }
    setError(null);
    setRows(res.data ?? []);
  }, [t, filterCategory, filterStatus, search, loadCatalogs]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const defaultStatus = statuses.find((s) => s.isDefault)?.code;
    return {
      total: rows.length,
      defaultCount: rows.filter((a) => a.status === defaultStatus).length,
      categories: categories.length,
      statuses: statuses.length,
    };
  }, [rows, categories, statuses]);

  const categoryByCode = useMemo(
    () => new Map(categories.map((item) => [item.code, item])),
    [categories],
  );
  const statusByCode = useMemo(
    () => new Map(statuses.map((item) => [item.code, item])),
    [statuses],
  );

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  }

  function openCreate() {
    setFormError(null);
    setName('');
    setCode('');
    setCategory(categories.find((item) => item.isDefault)?.code ?? categories[0]?.code ?? '');
    setStatus(statuses.find((item) => item.isDefault)?.code ?? statuses[0]?.code ?? '');
    setLocation('');
    setMaintenanceDate('');
    setEditingId(null);
    setModalMode('create');
  }

  function openEdit(a: AssetRow) {
    setFormError(null);
    setName(a.name);
    setCode(a.code);
    setCategory(a.category);
    setStatus(a.status);
    setLocation(a.location ?? '');
    setMaintenanceDate(toDateInput(a.maintenanceDate));
    setEditingId(a.id);
    setModalMode('edit');
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setFormError(t('assets.validationRequired'));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const body = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      category,
      status,
      location: location.trim(),
      maintenanceDate: maintenanceDate || '',
    };
    const res =
      modalMode === 'edit' && editingId
        ? await apiFetch(`/assets/${editingId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : await apiFetch('/assets', {
            method: 'POST',
            body: JSON.stringify({
              ...body,
              location: location.trim() || undefined,
              maintenanceDate: maintenanceDate || undefined,
            }),
          });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(
        await parseApiError(
          res,
          modalMode === 'edit' ? t('assets.updateFailed') : t('assets.createFailed'),
        ),
      );
      return;
    }
    closeModal();
    await load();
  }

  async function deleteAsset(a: AssetRow) {
    if (!window.confirm(t('assets.deleteConfirm', { name: a.name }))) {
      return;
    }
    setDeletingId(a.id);
    setError(null);
    const res = await apiFetch(`/assets/${a.id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (!res.ok) {
      setError(await parseApiError(res, t('assets.deleteFailed')));
      return;
    }
    await load();
  }

  const isEdit = modalMode === 'edit';

  return (
    <div>
      <PageHeader
        title={t('assets.title')}
        subtitle={t('assets.subtitleLive')}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold uppercase"
            >
              {t('common.retry')}
            </button>
            {canWrite && tab === 'assets' ? (
              <button
                type="button"
                onClick={() => openCreate()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary"
              >
                {t('assets.register')}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="mt-5 flex gap-1 border-b border-outline-variant">
        {(['assets', 'categories', 'statuses'] as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-4 py-3 text-xs font-bold uppercase transition-colors ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t(
              key === 'assets'
                ? 'assets.tabAssets'
                : key === 'categories'
                  ? 'assets.tabCategories'
                  : 'assets.tabStatuses',
            )}
            <span className="ml-2 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px]">
              {key === 'assets' ? rows.length : key === 'categories' ? categories.length : statuses.length}
            </span>
          </button>
        ))}
      </div>

      {tab === 'assets' ? (
        <>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-[10px] font-bold uppercase text-on-surface-variant">{t('assets.statTotal')}</p>
          <p className="mt-1 text-2xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-[10px] font-bold uppercase text-on-surface-variant">
            {statuses.find((item) => item.isDefault)?.name ?? t('assets.defaultStatus')}
          </p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{stats.defaultCount}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-[10px] font-bold uppercase text-on-surface-variant">
            {t('assets.tabCategories')}
          </p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{stats.categories}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-[10px] font-bold uppercase text-on-surface-variant">
            {t('assets.tabStatuses')}
          </p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{stats.statuses}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[220px] flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder={t('assets.searchPlaceholder')}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-3 text-sm outline-none ring-primary focus:ring-2"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(ev) => setFilterCategory(ev.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
        >
          <option value="">{t('assets.filterAllCategories')}</option>
          {categories.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(ev) => setFilterStatus(ev.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
        >
          <option value="">{t('assets.filterAllStatuses')}</option>
          {statuses.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? <p className="mt-4 text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-on-surface-variant">
                {t('assets.assetCol')}
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase text-on-surface-variant">
                {t('assets.codeCol')}
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase text-on-surface-variant">
                {t('assets.categoryCol')}
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase text-on-surface-variant">
                {t('assets.locationCol')}
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase text-on-surface-variant">
                {t('assets.statusCol')}
              </th>
              {canWrite ? (
                <th className="px-6 py-4 text-end text-xs font-bold uppercase text-on-surface-variant">
                  {t('assets.actionsCol')}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {rows.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={canWrite ? 6 : 5}
                  className="px-6 py-8 text-center text-on-surface-variant"
                >
                  {t('assets.empty')}
                </td>
              </tr>
            ) : null}
            {rows.map((a) => (
              <tr key={a.id} className="group hover:bg-surface-container-low/80">
                <td className="px-6 py-4">
                  <p className="font-semibold text-on-surface">{a.name}</p>
                  {a._count ? (
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">
                      {t('assets.metaCounts', {
                        tasks: a._count.taskLinks,
                        photos: a._count.photos,
                      })}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-on-surface-variant">{a.code}</td>
                <td className="px-4 py-4 text-on-surface-variant">
                  {categoryByCode.get(a.category)?.name ?? a.category}
                </td>
                <td className="px-4 py-4 text-on-surface-variant">{a.location ?? '—'}</td>
                <td className="px-4 py-4">
                  <span
                    className="inline-block rounded border px-2 py-1 text-[10px] font-bold uppercase text-white"
                    style={{
                      backgroundColor: statusByCode.get(a.status)?.color ?? '#616161',
                      borderColor: statusByCode.get(a.status)?.color ?? '#616161',
                    }}
                  >
                    {statusByCode.get(a.status)?.name ?? a.status}
                  </span>
                </td>
                {canWrite ? (
                  <td className="px-6 py-4 text-end">
                    <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
                        title={t('assets.edit')}
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAsset(a)}
                        disabled={deletingId === a.id}
                        className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                        title={t('assets.delete')}
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      ) : null}

      {tab === 'categories' ? (
        <div className="mt-6">
          <AssetCatalogPanel
            kind="categories"
            rows={categories}
            canWrite={canWrite}
            onChanged={async () => {
              await loadCatalogs();
              await load();
            }}
          />
        </div>
      ) : null}

      {tab === 'statuses' ? (
        <div className="mt-6">
          <AssetCatalogPanel
            kind="statuses"
            rows={statuses}
            canWrite={canWrite}
            onChanged={async () => {
              await loadCatalogs();
              await load();
            }}
          />
        </div>
      ) : null}

      {modalMode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => closeModal()}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <h2 className="text-lg font-bold text-on-surface">
              {isEdit ? t('assets.editTitle') : t('assets.createTitle')}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {isEdit ? t('assets.editSubtitle') : t('assets.createSubtitle')}
            </p>
            <form className="mt-6 space-y-4" onSubmit={(ev) => void submitForm(ev)}>
              {formError ? <p className="text-sm text-error">{formError}</p> : null}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('assets.nameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('assets.codeLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(ev) => setCode(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 font-mono text-sm uppercase outline-none ring-primary focus:ring-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('assets.categoryCol')}
                  </label>
                  <select
                    value={category}
                    onChange={(ev) => setCategory(ev.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                  >
                    {categories.map((item) => (
                      <option key={item.id} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('assets.statusCol')}
                  </label>
                  <select
                    value={status}
                    onChange={(ev) => setStatus(ev.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                  >
                    {statuses.map((item) => (
                      <option key={item.id} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('assets.locationCol')}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(ev) => setLocation(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {t('assets.maintenanceLabel')}
                </label>
                <input
                  type="date"
                  value={maintenanceDate}
                  onChange={(ev) => setMaintenanceDate(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => closeModal()}
                  className="flex-1 rounded-lg border border-outline-variant py-3 text-sm font-bold uppercase text-on-surface"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold uppercase text-on-primary disabled:opacity-50"
                >
                  {submitting
                    ? t('common.saving')
                    : isEdit
                      ? t('assets.saveChanges')
                      : t('assets.register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

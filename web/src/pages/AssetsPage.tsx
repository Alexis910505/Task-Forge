import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiJson } from '@/lib/api';

type AssetRow = {
  id: string;
  name: string;
  code: string;
  category: string;
  status: string;
  location?: string | null;
};

export function AssetsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiJson<AssetRow[]>('/assets');
    setLoading(false);
    if (!res.ok) {
      setError(t('common.loadError', { status: res.status }));
      setRows([]);
      return;
    }
    setError(null);
    setRows(res.data ?? []);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title={t('assets.title')}
        subtitle={t('assets.subtitleLive')}
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold uppercase"
          >
            {t('common.retry')}
          </button>
        }
      />
      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <div className="mt-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-on-surface-variant">{t('assets.assetCol')}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-on-surface-variant">{t('assets.codeCol')}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-on-surface-variant">{t('assets.categoryCol')}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-on-surface-variant">{t('assets.locationCol')}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-on-surface-variant">{t('assets.statusCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                  {t('assets.empty')}
                </td>
              </tr>
            ) : null}
            {rows.map((a) => (
              <tr key={a.id} className="hover:bg-surface-container-low/80">
                <td className="px-6 py-4 font-semibold text-on-surface">{a.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">{a.code}</td>
                <td className="px-6 py-4 text-on-surface-variant">{a.category}</td>
                <td className="px-6 py-4 text-on-surface-variant">{a.location ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase bg-surface-container-high text-on-surface-variant">
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

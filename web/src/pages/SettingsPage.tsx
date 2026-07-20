import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { resolveUploadUrl } from '@/lib/api';
import { apiFetch, apiJson } from '@/lib/api';
import { isAllowedBrandingFile, uploadOrgBranding } from '@/lib/orgBranding';
import {
  mergeOrgSettings,
  parseOrgSettings,
  type EmailPreferences,
  type OrganizationSettings,
} from '@/lib/orgSettings';
import { userHasPermission } from '@/lib/rolePermissions';
import { timezoneOptionsIncluding } from '@/lib/timezones';

type SettingsTab = 'workspace' | 'notifications' | 'security' | 'api';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  settings?: unknown;
};

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

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canWrite = userHasPermission(user, 'organizations:write');

  const [tab, setTab] = useState<SettingsTab>('workspace');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingGeneral, setEditingGeneral] = useState(false);

  const [org, setOrg] = useState<OrgRow | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>({
    taskEscalations: true,
    weeklyAnalytics: false,
    deploymentAlerts: true,
  });

  const timezoneOptions = useMemo(
    () => timezoneOptionsIncluding(i18n.resolvedLanguage ?? 'es', timezone),
    [i18n.resolvedLanguage, timezone],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiJson<OrgRow>('/organizations/current');
    setLoading(false);
    if (!res.ok) {
      setError(t('common.loadError', { status: res.status }));
      return;
    }
    const row = res.data;
    if (!row) return;
    setOrg(row);
    setName(row.name);
    const parsed = parseOrgSettings(row.settings);
    setTimezone(parsed.timezone ?? 'UTC');
    setEmailPrefs({
      taskEscalations: parsed.emailPreferences?.taskEscalations ?? true,
      weeklyAnalytics: parsed.emailPreferences?.weeklyAnalytics ?? false,
      deploymentAlerts: parsed.emailPreferences?.deploymentAlerts ?? true,
    });
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(patch: {
    name?: string;
    settings?: OrganizationSettings;
  }) {
    if (!canWrite) return false;
    setSaving(true);
    setSaveError(null);
    const currentSettings = parseOrgSettings(org?.settings);
    const nextSettings = patch.settings ?? currentSettings;
    const res = await apiFetch('/organizations/current', {
      method: 'PATCH',
      body: JSON.stringify({
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        settings: {
          timezone: nextSettings.timezone ?? timezone,
          emailPreferences: nextSettings.emailPreferences ?? emailPrefs,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(await parseApiError(res, t('settings.saveFailed')));
      return false;
    }
    const updated = (await res.json()) as OrgRow;
    setOrg(updated);
    setName(updated.name);
    return true;
  }

  async function saveGeneral() {
    const ok = await persist({ name, settings: mergeOrgSettings(parseOrgSettings(org?.settings), { timezone }) });
    if (ok) setEditingGeneral(false);
  }

  async function updateEmailPref(key: keyof EmailPreferences, value: boolean) {
    const next = { ...emailPrefs, [key]: value };
    setEmailPrefs(next);
    if (!canWrite) return;
    const parsed = parseOrgSettings(org?.settings);
    await persist({
      settings: mergeOrgSettings(parsed, {
        timezone: parsed.timezone ?? timezone,
        emailPreferences: next,
      }),
    });
  }

  const tabs: { id: SettingsTab; icon: string; label: string }[] = [
    { id: 'workspace', icon: 'business', label: t('settings.tabWorkspace') },
    { id: 'notifications', icon: 'notifications_active', label: t('settings.tabNotifications') },
    { id: 'security', icon: 'security', label: t('settings.tabSecurity') },
    { id: 'api', icon: 'integration_instructions', label: t('settings.tabApi') },
  ];

  return (
    <div className="mx-auto max-w-container">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-on-surface md:text-[32px] md:leading-10">
          {t('settings.workspaceTitle')}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t('settings.workspaceSubtitle')}</p>
      </div>

      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {saveError ? (
        <p className="mb-4 text-sm text-error" role="alert">
          {saveError}
        </p>
      ) : null}

      {!loading && !error ? (
        <div className="flex flex-col gap-8 lg:flex-row">
          <nav
            className="flex shrink-0 flex-row gap-1 overflow-x-auto pb-2 lg:w-64 lg:flex-col lg:pb-0"
            aria-label={t('settings.navLabel')}
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={[
                  'flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors',
                  tab === item.id
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high',
                ].join(' ')}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
            {tab === 'workspace' ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                <WorkspaceGeneralCard
                  t={t}
                  canWrite={canWrite}
                  editingGeneral={editingGeneral}
                  saving={saving}
                  name={name}
                  timezone={timezone}
                  timezoneOptions={timezoneOptions}
                  slug={org?.slug ?? ''}
                  onNameChange={setName}
                  onTimezoneChange={setTimezone}
                  onStartEdit={() => setEditingGeneral(true)}
                  onCancelEdit={() => {
                    setEditingGeneral(false);
                    setName(org?.name ?? '');
                    setTimezone(parseOrgSettings(org?.settings).timezone ?? 'UTC');
                  }}
                  onSaveGeneral={() => void saveGeneral()}
                />
                <WorkspaceLogoCard
                  t={t}
                  canWrite={canWrite}
                  logoUrl={org?.logoUrl}
                  faviconUrl={org?.faviconUrl}
                  onUploaded={() => void load()}
                  onError={setSaveError}
                />
                <EmailPreferencesCard
                  t={t}
                  canWrite={canWrite}
                  saving={saving}
                  emailPrefs={emailPrefs}
                  onToggle={(k, v) => void updateEmailPref(k, v)}
                />
                <div className="md:col-span-12">
                  <SecurityPanel t={t} canWrite={canWrite} />
                </div>
              </div>
            ) : null}

            {tab === 'notifications' ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                <div className="md:col-span-8">
                  <EmailPreferencesCard
                    t={t}
                    canWrite={canWrite}
                    saving={saving}
                    emailPrefs={emailPrefs}
                    onToggle={(k, v) => void updateEmailPref(k, v)}
                  />
                </div>
                <section className="md:col-span-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
                  <h2 className="text-lg font-semibold text-on-surface">{t('settings.language')}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{t('settings.languageSectionDesc')}</p>
                  <div className="mt-4">
                    <LanguageToggle />
                  </div>
                </section>
              </div>
            ) : null}

            {tab === 'security' ? <SecurityPanel t={t} canWrite={canWrite} /> : null}
            {tab === 'api' ? <ApiPanel t={t} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceGeneralCard({
  t,
  canWrite,
  editingGeneral,
  saving,
  name,
  timezone,
  timezoneOptions,
  slug,
  onNameChange,
  onTimezoneChange,
  onStartEdit,
  onCancelEdit,
  onSaveGeneral,
}: {
  t: (key: string) => string;
  canWrite: boolean;
  editingGeneral: boolean;
  saving: boolean;
  name: string;
  timezone: string;
  timezoneOptions: { value: string; label: string }[];
  slug: string;
  onNameChange: (v: string) => void;
  onTimezoneChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveGeneral: () => void;
}) {
  const readOnly = !editingGeneral || !canWrite;

  return (
      <section className="md:col-span-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-on-surface">{t('settings.generalInfo')}</h2>
          {canWrite && !editingGeneral ? (
            <button
              type="button"
              onClick={onStartEdit}
              className="text-xs font-bold uppercase text-primary hover:underline"
            >
              {t('settings.editInfo')}
            </button>
          ) : null}
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase text-on-surface-variant">
                {t('settings.workspaceName')}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                readOnly={readOnly}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm outline-none read-only:opacity-80 focus:ring-2 focus:ring-primary disabled:opacity-60"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase text-on-surface-variant">
                {t('settings.timezone')}
              </span>
              <select
                value={timezone}
                onChange={(e) => onTimezoneChange(e.target.value)}
                disabled={readOnly}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase text-on-surface-variant">
              {t('settings.workspaceUrl')}
            </span>
            <div className="flex items-stretch">
              <span className="flex items-center rounded-l-lg border border-r-0 border-outline-variant bg-surface-container px-3 text-sm text-on-surface-variant">
                taskforge.io/
              </span>
              <input
                type="text"
                value={slug}
                readOnly
                className="w-full rounded-r-lg border border-outline-variant bg-surface px-4 py-2 text-sm outline-none opacity-80"
              />
            </div>
          </label>
          {editingGeneral && canWrite ? (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex-1 rounded-lg border border-outline-variant py-2.5 text-xs font-bold uppercase"
              >
                {t('settings.cancel')}
              </button>
              <button
                type="button"
                disabled={saving || name.trim().length < 2}
                onClick={onSaveGeneral}
                className="flex-1 rounded-lg bg-primary py-2.5 text-xs font-bold uppercase text-on-primary disabled:opacity-50"
              >
                {saving ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          ) : null}
        </div>
      </section>
  );
}

function WorkspaceLogoCard({
  t,
  canWrite,
  logoUrl,
  faviconUrl,
  onUploaded,
  onError,
}: {
  t: (key: string) => string;
  canWrite: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  onUploaded: () => void;
  onError: (msg: string | null) => void;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [cacheBust, setCacheBust] = useState(0);
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null);

  async function handleFile(kind: 'logo' | 'favicon', file: File | undefined) {
    if (!file) return;
    onError(null);
    if (!isAllowedBrandingFile(file, kind)) {
      onError(t('settings.brandingInvalidFile'));
      return;
    }
    setUploading(kind);
    const res = await uploadOrgBranding(kind, file);
    setUploading(null);
    if (!res.ok) {
      onError(res.message ?? t('settings.brandingUploadFailed'));
      return;
    }
    setCacheBust(Date.now());
    onUploaded();
  }

  const logoSrc = logoUrl ? `${resolveUploadUrl(logoUrl)}?v=${cacheBust}` : null;
  const faviconSrc = faviconUrl ? `${resolveUploadUrl(faviconUrl)}?v=${cacheBust}` : null;

  return (
    <section className="md:col-span-4 flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <h2 className="mb-4 w-full text-left text-xs font-bold uppercase text-on-surface-variant">
        {t('settings.logoSection')}
      </h2>
      <div className="flex flex-1 flex-col items-center text-center">
        <p className="mb-2 w-full text-left text-[10px] font-bold uppercase text-on-surface-variant">
          {t('settings.logoLabel')}
        </p>
        <button
          type="button"
          disabled={!canWrite || uploading !== null}
          onClick={() => logoInputRef.current?.click()}
          className="relative mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-outline-variant bg-surface-container-high transition-colors hover:border-primary disabled:opacity-60"
        >
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <BrandLogo className="h-14 w-14" alt="" />
          )}
        </button>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          onChange={(e) => {
            void handleFile('logo', e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        <p className="mb-2 w-full text-left text-[10px] font-bold uppercase text-on-surface-variant">
          {t('settings.iconLabel')}
        </p>
        <button
          type="button"
          disabled={!canWrite || uploading !== null}
          onClick={() => faviconInputRef.current?.click()}
          className="group mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-high transition-colors hover:border-primary disabled:opacity-60"
        >
          {faviconSrc ? (
            <img src={faviconSrc} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="material-symbols-outlined text-2xl text-outline">web_asset</span>
          )}
        </button>
        <input
          ref={faviconInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          onChange={(e) => {
            void handleFile('favicon', e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        <p className="mb-4 text-sm text-on-surface-variant">{t('settings.logoHint')}</p>
        {canWrite ? (
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              disabled={uploading !== null}
              onClick={() => logoInputRef.current?.click()}
              className="w-full rounded-lg border border-outline-variant py-2 text-xs font-bold uppercase transition-colors hover:bg-surface-container disabled:opacity-50"
            >
              {uploading === 'logo' ? t('settings.uploading') : t('settings.uploadLogo')}
            </button>
            <button
              type="button"
              disabled={uploading !== null}
              onClick={() => faviconInputRef.current?.click()}
              className="w-full rounded-lg border border-outline-variant py-2 text-xs font-bold uppercase transition-colors hover:bg-surface-container disabled:opacity-50"
            >
              {uploading === 'favicon' ? t('settings.uploading') : t('settings.uploadIcon')}
            </button>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('settings.readOnlyHint')}</p>
        )}
        <p className="mt-2 text-[10px] text-on-surface-variant">{t('settings.brandingFormats')}</p>
      </div>
    </section>
  );
}

function EmailPreferencesCard({
  t,
  canWrite,
  saving,
  emailPrefs,
  onToggle,
}: {
  t: (key: string) => string;
  canWrite: boolean;
  saving: boolean;
  emailPrefs: EmailPreferences;
  onToggle: (key: keyof EmailPreferences, value: boolean) => void;
}) {
  return (
    <section className="md:col-span-12 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <h2 className="mb-6 text-lg font-semibold text-on-surface">{t('settings.emailPreferences')}</h2>
      <ToggleRow
        label={t('settings.taskEscalations')}
        description={t('settings.taskEscalationsDesc')}
        checked={emailPrefs.taskEscalations}
        disabled={!canWrite || saving}
        onChange={(v) => onToggle('taskEscalations', v)}
      />
      <ToggleRow
        label={t('settings.weeklyAnalytics')}
        description={t('settings.weeklyAnalyticsDesc')}
        checked={emailPrefs.weeklyAnalytics}
        disabled={!canWrite || saving}
        onChange={(v) => onToggle('weeklyAnalytics', v)}
      />
      <ToggleRow
        label={t('settings.deploymentAlerts')}
        description={t('settings.deploymentAlertsDesc')}
        checked={emailPrefs.deploymentAlerts}
        disabled={!canWrite || saving}
        onChange={(v) => onToggle('deploymentAlerts', v)}
      />
      {!canWrite ? (
        <p className="mt-4 text-xs text-on-surface-variant">{t('settings.readOnlyHint')}</p>
      ) : null}
    </section>
  );
}

function SecurityPanel({ t, canWrite }: { t: (key: string) => string; canWrite: boolean }) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="rounded-lg bg-error-container p-3 text-on-error-container">
          <span className="material-symbols-outlined">lock_person</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-on-surface">{t('settings.ssoTitle')}</h2>
          <p className="text-sm text-on-surface-variant">{t('settings.ssoDesc')}</p>
        </div>
        <button
          type="button"
          disabled={!canWrite}
          className="rounded-lg bg-primary px-6 py-2 text-xs font-bold uppercase text-on-primary disabled:opacity-50"
        >
          {t('settings.configureSso')}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureChip icon="shield" label={t('settings.feature2fa')} />
        <FeatureChip icon="history" label={t('settings.featureRotation')} />
        <FeatureChip icon="vpn_key" label={t('settings.featureIp')} muted />
      </div>
      <p className="mt-4 text-xs text-on-surface-variant">{t('settings.securitySoon')}</p>
    </section>
  );
}

function ApiPanel({ t }: { t: (key: string) => string }) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <h2 className="text-lg font-semibold text-on-surface">{t('settings.apiTitle')}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{t('settings.apiDesc')}</p>
      <button
        type="button"
        disabled
        className="mt-6 rounded-lg border border-outline-variant px-6 py-2 text-xs font-bold uppercase text-on-surface-variant opacity-60"
      >
        {t('settings.generateKey')}
      </button>
      <p className="mt-3 text-xs text-on-surface-variant">{t('settings.apiSoon')}</p>
    </section>
  );
}

function FeatureChip({
  icon,
  label,
  muted,
}: {
  icon: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4',
        muted ? 'opacity-50' : '',
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <span className="text-xs font-bold uppercase">{label}</span>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 border-t border-outline-variant/30 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <div>
        <p className="font-medium text-on-surface">{label}</p>
        <p className="text-sm text-on-surface-variant">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-6 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-surface-container-highest',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'right-1' : 'left-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

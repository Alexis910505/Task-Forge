import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { apiFetch, apiJson } from '@/lib/api';
import { profileSkills } from '@/lib/profileExtras';
import { roleLabel } from '@/lib/roleLabels';

type MeUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: { id: string; name: string; organizationId: string };
  department?: { id: string; name: string } | null;
};

type ProfileMeta = {
  user: MeUser;
  location: string | null;
};

const fieldClass =
  'w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2';

const readOnlyClass =
  'w-full rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant';

export function EditProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [meta, setMeta] = useState<ProfileMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiJson<ProfileMeta>('/users/me/profile');
    setLoading(false);
    if (!res.ok || !res.data) {
      setLoadError(t('common.loadError', { status: res.status }));
      setMeta(null);
      return;
    }
    setLoadError(null);
    setMeta(res.data);
    setFirstName(res.data.user.firstName);
    setLastName(res.data.user.lastName);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewInitials = useMemo(() => {
    const f = firstName.trim();
    const l = lastName.trim();
    return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase() || '?';
  }, [firstName, lastName]);

  const dirty =
    meta != null &&
    (firstName.trim() !== meta.user.firstName || lastName.trim() !== meta.user.lastName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    setSaveError(null);
    const res = await apiFetch('/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      setSaveError(msg || t('profile.saveFailed'));
      return;
    }
    await refreshProfile();
    navigate('/profile', { replace: true });
  }

  const user = meta?.user;
  const skills = profileSkills(user?.department?.name);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 pb-24">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        <Link to="/profile" className="hover:text-primary">
          {t('profile.title')}
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-on-surface">{t('profile.editProfile')}</span>
      </nav>

      {loading ? <p className="text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
      {loadError ? <p className="text-sm text-error">{loadError}</p> : null}

      {user ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
          <div className="flex flex-col gap-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 md:flex-row md:items-center">
            <div className="relative shrink-0">
              <Avatar
                initials={previewInitials}
                className="h-24 w-24 rounded-2xl border-2 border-primary/20 text-2xl md:h-28 md:w-28"
              />
              {user.isActive ? (
                <span className="absolute -bottom-2 -right-2 rounded-lg border-2 border-background bg-tertiary p-1 text-on-tertiary">
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-on-surface md:text-3xl">
                {t('profile.editProfile')}
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">{t('profile.editSubtitle')}</p>
              <p className="mt-3 text-lg font-semibold text-on-surface">
                {firstName.trim() || '—'} {lastName.trim()}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="rounded bg-secondary-container px-2 py-0.5 text-xs font-bold text-on-secondary-container">
                  {roleLabel(user.role.name, t)}
                </span>
                {user.department ? (
                  <span className="flex items-center gap-1 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">domain</span>
                    {user.department.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <section className="col-span-12 space-y-6 lg:col-span-7">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-primary">person</span>
                  {t('profile.editSectionPersonal')}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">{t('profile.editSectionPersonalDesc')}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profile-first-name"
                      className="mb-1 block text-xs font-bold uppercase text-on-surface-variant"
                    >
                      {t('users.firstName')}
                    </label>
                    <input
                      id="profile-first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-last-name"
                      className="mb-1 block text-xs font-bold uppercase text-on-surface-variant"
                    >
                      {t('users.lastName')}
                    </label>
                    <input
                      id="profile-last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      className={fieldClass}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  {t('profile.editSectionAccount')}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">{t('profile.editSectionAccountDesc')}</p>
                <div className="mt-6">
                  <label className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('profile.email')}
                  </label>
                  <div className={readOnlyClass}>{user.email}</div>
                  <p className="mt-2 text-xs text-on-surface-variant">{t('profile.emailReadonlyHint')}</p>
                </div>
              </div>
            </section>

            <aside className="col-span-12 space-y-6 lg:col-span-5">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-primary">corporate_fare</span>
                  {t('profile.editSectionOrg')}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">{t('profile.editSectionOrgDesc')}</p>
                <dl className="mt-6 space-y-4">
                  <div>
                    <dt className="mb-1 text-xs font-bold uppercase text-on-surface-variant">
                      {t('profile.roleLabel')}
                    </dt>
                    <dd className={readOnlyClass}>{roleLabel(user.role.name, t)}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-xs font-bold uppercase text-on-surface-variant">
                      {t('profile.department')}
                    </dt>
                    <dd className={readOnlyClass}>{user.department?.name ?? t('users.deptNone')}</dd>
                  </div>
                  {meta.location ? (
                    <div>
                      <dt className="mb-1 text-xs font-bold uppercase text-on-surface-variant">
                        {t('profile.locationLabel')}
                      </dt>
                      <dd className={`${readOnlyClass} flex items-center gap-2`}>
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {meta.location}
                      </dd>
                      <p className="mt-2 text-xs text-on-surface-variant">{t('profile.locationReadonlyHint')}</p>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6">
                <h3 className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  {t('profile.editPreviewSkills')}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold text-on-surface"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-on-surface-variant">{t('profile.editPreviewSkillsHint')}</p>
              </div>
            </aside>
          </div>

          {saveError ? (
            <p className="rounded-lg border border-error-container bg-error-container/30 px-4 py-3 text-sm text-on-error-container">
              {saveError}
            </p>
          ) : null}

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest/95 px-6 py-4 shadow-lg backdrop-blur-sm">
            <Link
              to="/profile"
              className="rounded-lg border border-outline-variant px-6 py-2.5 text-xs font-bold uppercase text-on-surface-variant hover:bg-surface-container-high"
            >
              {t('profile.cancelEdit')}
            </Link>
            <button
              type="submit"
              disabled={saving || !firstName.trim() || !lastName.trim() || !dirty}
              className="rounded-lg bg-primary px-6 py-2.5 text-xs font-bold uppercase text-on-primary disabled:opacity-50"
            >
              {saving ? t('createTask.saving') : t('profile.saveProfile')}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

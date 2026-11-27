import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { MicrosoftButton } from '@/components/auth/MicrosoftButton';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { ORGANIZATION_SLUG, startMicrosoftSignIn, useMicrosoftEnabled } from '@/lib/microsoftSignIn';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const microsoft = useMicrosoftEnabled();
  // Datos de prueba solo en desarrollo; nunca en la versión publicada.
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@taskforge.local' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'Admin123!' : '');
  const msError = params.get('msError');
  const [error, setError] = useState<string | null>(msError ? t(`sso.errors.${msError}`, t('sso.errors.failed')) : null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ organizationSlug: ORGANIZATION_SLUG, email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background px-4 py-12">
      <div className="relative w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <LanguageToggle className="absolute end-6 top-6" />
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-surface-container-high ring-1 ring-outline-variant/40">
            <BrandLogo className="h-12 w-12" alt={t('app.brand')} />
          </div>
          <h1 className="text-xl font-semibold text-on-surface">{t('login.title')}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t('login.subtitle')}</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-error/30 bg-error-container/30 px-3 py-2 text-sm text-error" role="alert">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-sm outline-none ring-primary focus:border-transparent focus:ring-2"
              placeholder={t('login.emailPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-sm outline-none ring-primary focus:border-transparent focus:ring-2"
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="block w-full rounded bg-primary py-3 text-center text-sm font-bold uppercase text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>

        {microsoft ? (
          <>
            <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <span className="h-px flex-1 bg-outline-variant" />
              {t('sso.or')}
              <span className="h-px flex-1 bg-outline-variant" />
            </div>
            <MicrosoftButton large onClick={() => startMicrosoftSignIn()} />
            <p className="mt-2 text-center text-xs text-on-surface-variant">{t('sso.microsoftHint')}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}

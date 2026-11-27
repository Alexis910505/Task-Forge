import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { MicrosoftButton } from '@/components/auth/MicrosoftButton';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { apiPath } from '@/lib/api';
import { clientSessionPayload } from '@/lib/clientSession';
import { startMicrosoftSignIn } from '@/lib/microsoftSignIn';

type Invitation = { email: string; firstName: string; organizationName: string; microsoft: boolean };

/** Página del enlace de invitación: activar la cuenta con Microsoft o con una contraseña. */
export function InvitePage() {
  const { t } = useTranslation();
  const { token = '' } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'expired'>('loading');
  const msError = params.get('msError');
  const [error, setError] = useState<string | null>(msError ? t(`sso.errors.${msError}`, t('sso.errors.failed')) : null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(apiPath(`/auth/invitations/${encodeURIComponent(token)}`)).then(async (r) => {
      if (r.status === 410) return setState('expired');
      if (!r.ok) return setState('invalid');
      const data = (await r.json()) as Invitation;
      setInv(data);
      setShowPassword(!data.microsoft);
      setState('ready');
    });
  }, [token]);

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(t('invite.passwordShort'));
    if (password !== password2) return setError(t('invite.passwordMismatch'));
    setSaving(true);
    setError(null);
    const res = await fetch(apiPath(`/auth/invitations/${encodeURIComponent(token)}/accept`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...clientSessionPayload() }),
    });
    if (!res.ok) {
      setSaving(false);
      return setError(res.status === 410 ? t('invite.expired') : t('invite.activateFailed'));
    }
    await completeLogin(await res.json());
    navigate('/', { replace: true });
  }

  const input =
    'w-full rounded border border-outline-variant bg-surface-container-low px-3 py-3 text-base outline-none ring-primary focus:border-transparent focus:ring-2';

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background px-4 py-12">
      <div className="relative w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <LanguageToggle className="absolute end-6 top-6" />
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-surface-container-high ring-1 ring-outline-variant/40">
            <BrandLogo className="h-12 w-12" alt={t('app.brand')} />
          </div>
          {state === 'ready' && inv ? (
            <>
              <h1 className="text-2xl font-semibold text-on-surface">{t('invite.hello', { name: inv.firstName })}</h1>
              <p className="mt-2 text-base text-on-surface-variant">
                {t('invite.subtitle', { org: inv.organizationName })}
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">{inv.email}</p>
            </>
          ) : null}
        </div>

        {state === 'loading' ? <p className="text-center text-sm text-on-surface-variant">{t('common.loading')}</p> : null}
        {state === 'invalid' || state === 'expired' ? (
          <div className="rounded-lg border border-error/30 bg-error-container/30 p-4 text-center text-base text-error">
            {state === 'expired' ? t('invite.expired') : t('invite.invalid')}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-error/30 bg-error-container/30 px-3 py-2 text-sm text-error" role="alert">
            {error}
          </div>
        ) : null}

        {state === 'ready' && inv ? (
          <>
            {inv.microsoft ? (
              <>
                <p className="mb-4 text-center text-base text-on-surface">{t('invite.microsoftStep')}</p>
                <MicrosoftButton large onClick={() => startMicrosoftSignIn(token)} />
                <p className="mt-3 text-center text-sm text-on-surface-variant">{t('invite.microsoftHint')}</p>
                {!showPassword ? (
                  <button
                    type="button"
                    onClick={() => setShowPassword(true)}
                    className="mt-8 block w-full text-center text-sm font-semibold text-primary hover:underline"
                  >
                    {t('invite.usePassword')}
                  </button>
                ) : null}
              </>
            ) : null}

            {showPassword ? (
              <form onSubmit={(e) => void activate(e)} className={inv.microsoft ? 'mt-8 space-y-4 border-t border-outline-variant pt-6' : 'space-y-4'}>
                <p className="text-sm text-on-surface-variant">{t('invite.passwordStep')}</p>
                <div>
                  <label htmlFor="inv-pw" className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('invite.password')}
                  </label>
                  <input id="inv-pw" type="password" autoComplete="new-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="inv-pw2" className="mb-1 block text-xs font-bold uppercase text-on-surface-variant">
                    {t('invite.passwordRepeat')}
                  </label>
                  <input id="inv-pw2" type="password" autoComplete="new-password" className={input} value={password2} onChange={(e) => setPassword2(e.target.value)} />
                </div>
                <button type="submit" disabled={saving} className="block w-full rounded bg-primary py-3 text-base font-bold text-on-primary disabled:opacity-60">
                  {saving ? t('common.loading') : t('invite.activate')}
                </button>
              </form>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

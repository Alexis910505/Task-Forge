import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { apiPath } from '@/lib/api';

/** Vuelta desde Microsoft: cambia el código de un solo uso por la sesión. */
export function MicrosoftCallbackPage() {
  const { t } = useTranslation();
  const { completeLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    const error = params.get('error');
    const invite = params.get('invite');
    const fail = (reason: string) =>
      navigate(
        invite ? `/invite/${encodeURIComponent(invite)}?msError=${reason}` : `/login?msError=${reason}`,
        { replace: true },
      );
    if (error || !code) {
      fail(error ?? 'failed');
      return;
    }
    void (async () => {
      try {
        const res = await fetch(apiPath('/auth/microsoft/exchange'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) return fail('session');
        await completeLogin(await res.json());
        navigate('/dashboard', { replace: true });
      } catch {
        fail('failed');
      }
    })();
  }, [params, completeLogin, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-8 text-sm text-on-surface-variant">
      {t('sso.signingIn')}
    </div>
  );
}

import { useTranslation } from 'react-i18next';

type Props = {
  className?: string;
};

export function LanguageToggle({ className }: Props) {
  const { i18n, t } = useTranslation();

  function setLang(lng: 'en' | 'es') {
    void i18n.changeLanguage(lng);
    try {
      localStorage.setItem('tf_lang', lng);
    } catch {
      /* ignore */
    }
  }

  const currentLang = i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en';

  return (
    <div
      className={['flex items-center gap-1 text-sm', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={t('settings.language')}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`rounded px-1.5 py-0.5 font-semibold tracking-wide ${
          currentLang === 'en' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        EN
      </button>
      <span className="text-on-surface-variant/40" aria-hidden>
        |
      </span>
      <button
        type="button"
        onClick={() => setLang('es')}
        className={`rounded px-1.5 py-0.5 font-semibold tracking-wide ${
          currentLang === 'es' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        ES
      </button>
    </div>
  );
}

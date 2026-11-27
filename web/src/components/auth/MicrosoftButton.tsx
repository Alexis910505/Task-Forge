import { useTranslation } from 'react-i18next';

/** Botón oficial «Entrar con Microsoft» (logotipo de 4 cuadros, según la guía de marca de Microsoft). */
export function MicrosoftButton({
  onClick,
  disabled,
  large,
}: {
  onClick: () => void;
  disabled?: boolean;
  large?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex w-full items-center justify-center gap-3 rounded border border-[#8c8c8c] bg-white font-semibold text-[#5e5e5e] transition-colors hover:bg-[#f3f3f3] disabled:opacity-60',
        large ? 'py-4 text-lg' : 'py-3 text-sm',
      ].join(' ')}
    >
      <svg width={large ? 24 : 20} height={large ? 24 : 20} viewBox="0 0 21 21" aria-hidden="true">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
      {t('sso.signInMicrosoft')}
    </button>
  );
}

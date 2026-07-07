import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="py-24 text-center">
      <p className="text-6xl font-black text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold text-on-surface">{t('notFound.title')}</h1>
      <p className="mt-2 text-on-surface-variant">{t('notFound.body')}</p>
      <Link to="/dashboard" className="mt-8 inline-block text-sm font-bold uppercase text-primary underline">
        {t('notFound.back')}
      </Link>
    </div>
  );
}

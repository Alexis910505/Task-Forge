import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { roleLabel } from '@/lib/roleLabels';

export function TopBar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadNotifications(Boolean(user));

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : t('common.userFallback');
  const roleText = user?.role ? roleLabel(user.role, t) : t('common.roleFallback');

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-4 md:left-sidebar-width md:px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative hidden max-w-md flex-1 sm:block">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
            search
          </span>
          <input
            type="search"
            placeholder={t('common.searchPlaceholder')}
            className="w-full rounded border border-outline-variant bg-surface-container-low py-1.5 pl-10 pr-4 text-sm outline-none ring-primary focus:border-transparent focus:ring-2"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <LanguageToggle className="shrink-0" />
        <Link
          to="/notifications"
          className="relative rounded p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          aria-label={t('common.notifications')}
        >
          <span className="material-symbols-outlined">notifications</span>
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold text-on-error">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Link>
        <Link
          to="/settings"
          className="rounded p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          aria-label={t('common.settings')}
        >
          <span className="material-symbols-outlined">settings</span>
        </Link>
        <Link to="/profile" className="flex items-center gap-3 border-l border-outline-variant pl-4">
          <div className="hidden text-right lg:block">
            <p className="text-xs font-bold text-on-surface">{displayName}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{roleText}</p>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-primary-container/25 text-xs font-bold text-primary"
            aria-hidden
          >
            {user
              ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.email[0].toUpperCase()
              : '?'}
          </div>
        </Link>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="hidden rounded border border-outline-variant px-3 py-1.5 text-xs font-bold uppercase text-on-surface-variant hover:bg-surface-container-high lg:inline-block"
        >
          {t('common.signOut')}
        </button>
      </div>
    </header>
  );
}

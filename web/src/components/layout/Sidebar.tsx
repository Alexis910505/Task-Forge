import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { userHasPermission } from '@/lib/rolePermissions';

const navRoutes = [
  { to: '/dashboard', key: 'nav.work', icon: 'assignment', permission: 'dashboard:read' as const },
  { to: '/kanban', key: 'nav.kanban', icon: 'format_list_bulleted', permission: 'boards:read' as const },
  { to: '/teams', key: 'nav.team', icon: 'groups', permission: 'teams:read' as const },
  { to: '/departments', key: 'nav.departments', icon: 'domain', permission: 'departments:read' as const },
  { to: '/assets', key: 'nav.assets', icon: 'inventory_2', permission: 'assets:read' as const },
  { to: '/users', key: 'nav.users', icon: 'manage_accounts', permission: 'users:read' as const },
  { to: '/reports', key: 'nav.reports', icon: 'bar_chart', permission: 'reports:read' as const },
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const visibleNav = navRoutes.filter((item) => userHasPermission(user, item.permission));
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-sidebar-width flex-col border-r border-outline-variant bg-inverse-surface text-inverse-on-surface md:flex">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/15">
          <BrandLogo className="h-10 w-10" alt={t('app.brand')} />
        </div>
        <div>
          <h1 className="text-lg font-black leading-none text-primary-fixed-dim">{t('app.brand')}</h1>
          <p className="text-[10px] font-bold uppercase tracking-tighter text-inverse-on-surface/60">{t('app.taglineEnterprise')}</p>
        </div>
      </div>
      <nav className="mt-4 flex flex-1 flex-col gap-1 px-2">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors',
                isActive
                  ? 'border-l-4 border-primary-fixed-dim bg-secondary-container/10 text-primary-fixed-dim'
                  : 'border-l-4 border-transparent text-inverse-on-surface/80 hover:bg-white/5',
              ].join(' ')
            }
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {t(item.key)}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-1 border-t border-white/10 px-2 py-4">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 rounded px-4 py-3 text-xs font-bold uppercase text-inverse-on-surface/80 hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-xl">person</span>
          {t('nav.profile')}
        </NavLink>
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded px-4 py-3 text-xs font-bold uppercase text-inverse-on-surface/80 hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
          {t('nav.settings')}
        </NavLink>
        <SidebarLogout />
        <a
          href="https://github.com"
          className="flex items-center gap-3 rounded px-4 py-3 text-xs font-bold uppercase text-inverse-on-surface/80 hover:bg-white/5"
          target="_blank"
          rel="noreferrer"
        >
          <span className="material-symbols-outlined text-xl">help_outline</span>
          {t('nav.support')}
        </a>
      </div>
    </aside>
  );
}

function SidebarLogout() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded px-4 py-3 text-left text-xs font-bold uppercase text-inverse-on-surface/80 hover:bg-white/5"
      onClick={() => {
        void (async () => {
          await logout();
          navigate('/login', { replace: true });
        })();
      }}
    >
      <span className="material-symbols-outlined text-xl">logout</span>
      {t('nav.logout')}
    </button>
  );
}

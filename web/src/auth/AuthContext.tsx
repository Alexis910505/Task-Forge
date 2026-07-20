import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18n from '@/i18n/config';
import {
  API_UNREACHABLE_EVENT,
  AUTH_EXPIRED_EVENT,
  apiFetch,
  apiPath,
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from '@/lib/api';
import { clientSessionPayload } from '@/lib/clientSession';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    name: string;
    organizationId: string;
    permissions?: string[];
    isSystem?: boolean;
  };
  department?: { id: string; name: string } | null;
};

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (input: { organizationSlug: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshProfile = useCallback(async () => {
    let res: Response;
    try {
      res = await apiFetch('/users/me');
    } catch {
      // Sin red / API caída: no borrar tokens, la sesión se restaura al volver la conexión.
      setUser(null);
      return;
    }
    if (res.status === 401 || res.status === 403) {
      setUser(null);
      clearStoredTokens();
      return;
    }
    if (!res.ok) {
      // Error temporal del servidor: conservar tokens.
      setUser(null);
      return;
    }
    setUser((await res.json()) as AuthUser);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('tf_access');
    if (!token) {
      setReady(true);
      return;
    }
    void (async () => {
      await refreshProfile();
      setReady(true);
    })();
  }, [refreshProfile]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      clearStoredTokens();
    };
    // API inaccesible: sacar al login pero mantener los tokens guardados.
    const onUnreachable = () => {
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener(API_UNREACHABLE_EVENT, onUnreachable);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener(API_UNREACHABLE_EVENT, onUnreachable);
    };
  }, []);

  const login = useCallback(async (input: { organizationSlug: string; email: string; password: string }) => {
    let res: Response;
    try {
      res = await fetch(apiPath('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationSlug: input.organizationSlug.trim().toLowerCase(),
          email: input.email.trim().toLowerCase(),
          password: input.password,
          ...clientSessionPayload(),
        }),
      });
    } catch (e) {
      const net =
        e instanceof TypeError
          ? i18n.t('errors.networkUnreachable')
          : e instanceof Error
            ? e.message
            : String(e);
      throw new Error(net);
    }
    const data = (await res.json().catch(() => ({}))) as {
      accessToken?: string;
      refreshToken?: string;
      message?: string | string[];
      code?: string;
    };
    if (!res.ok) {
      let msg: string | undefined;
      if (Array.isArray(data.message)) {
        msg = data.message.join(', ');
      } else if (typeof data.message === 'string') {
        msg = data.message;
      }
      throw new Error(msg || data.code || `HTTP ${res.status}`);
    }
    if (!data.accessToken || !data.refreshToken) {
      throw new Error(i18n.t('errors.loginInvalidResponse'));
    }
    setStoredTokens(data.accessToken, data.refreshToken);
    const me = await apiFetch('/users/me');
    if (!me.ok) {
      clearStoredTokens();
      throw new Error(i18n.t('errors.profileLoadFailed'));
    }
    setUser((await me.json()) as AuthUser);
  }, []);

  const logout = useCallback(async () => {
    const { refresh } = getStoredTokens();
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify(refresh ? { refreshToken: refresh } : {}),
      });
    } catch {
      /* ignorar red */
    }
    clearStoredTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      isAuthenticated: user != null,
      login,
      logout,
      refreshProfile,
    }),
    [ready, user, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(i18n.t('errors.useAuthOutsideProvider'));
  }
  return ctx;
}

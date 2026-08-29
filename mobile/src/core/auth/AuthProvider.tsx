import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { ezBookkeepingApi } from '../api/ezBookkeepingApi';
import { setUnauthorizedHandler } from '../api/httpClient';
import { clearSession, loadSession, saveSession } from '../storage/sessionStorage';
import type { UserBasicInfo } from '../types/domain';

interface AuthContextValue {
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  user?: UserBasicInfo;
  login(loginName: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [user, setUser] = useState<UserBasicInfo>();
  const [tokenPresent, setTokenPresent] = useState(false);

  const clearAuth = useCallback(async () => {
    await clearSession();
    setUser(undefined);
    setTokenPresent(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearAuth();
    });
    return () => setUnauthorizedHandler(undefined);
  }, [clearAuth]);

  useEffect(() => {
    void (async () => {
      const session = await loadSession();
      if (!session?.token) {
        setIsBootstrapping(false);
        return;
      }

      setTokenPresent(true);
      setUser(session.user);
      try {
        const profile = await ezBookkeepingApi.getProfile();
        setUser(profile);
        await saveSession({ token: session.token, user: profile });
      } catch {
        await clearAuth();
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, [clearAuth]);

  const login = useCallback(async (loginName: string, password: string) => {
    const response = await ezBookkeepingApi.login(loginName, password);

    if (response.need2FA) {
      throw new Error('该账号已启用两步验证，移动端两步验证将在下一阶段接入');
    }

    await saveSession({ token: response.token, user: response.user });
    setTokenPresent(true);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await ezBookkeepingApi.logout();
    } finally {
      await clearAuth();
    }
  }, [clearAuth]);

  const value = useMemo<AuthContextValue>(() => ({
    isBootstrapping,
    isAuthenticated: tokenPresent,
    user,
    login,
    logout,
  }), [isBootstrapping, login, logout, tokenPresent, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}

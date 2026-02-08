import { useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import {
  AUTH_DATA_KEY,
} from '../auth/constants';

interface UseAuthInitParams {
  isAuthPage: boolean;
  isTokenFresh: (token: string) => boolean;
  ensureValidAccessToken: () => Promise<{ accessToken: string; user: unknown } | null>;
  readAuthData: () => { accessToken: string; user: unknown } | null;
  setUser: (user: unknown | null) => void;
  setAccessToken: (token: string | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setIsTokenReady: (ready: boolean) => void;
  hasInitializedRef: React.MutableRefObject<boolean>;
}

export function useAuthInit({
  isAuthPage,
  isTokenFresh,
  ensureValidAccessToken,
  readAuthData,
  setUser,
  setAccessToken,
  setIsAuthLoading,
  setIsTokenReady,
  hasInitializedRef,
}: UseAuthInitParams) {
  useEffect(() => {
    if (isAuthPage) {
      const timeout = setTimeout(() => setIsAuthLoading(false), 0);
      return () => clearTimeout(timeout);
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const stored = readAuthData();
    if (stored?.accessToken && isTokenFresh(stored.accessToken)) {
      console.log('[App] 从 localStorage 恢复登录态（token 有效）');
      apiClient.defaults.headers.common.Authorization = `Bearer ${stored.accessToken}`;
      setIsTokenReady(true);
      setAccessToken(stored.accessToken);
      setUser(stored.user);
      setIsAuthLoading(false);
      return;
    }

    console.log('[App] localStorage 无有效 token，尝试 refresh-token（带跨标签页锁）');

    ensureValidAccessToken()
      .then(() => {
        const latest = readAuthData();
        if (latest?.accessToken) {
          setAccessToken(latest.accessToken);
          setUser(latest.user);
        }
      })
      .catch((err) => {
        console.error('[App] 刷新 token 失败:', err?.response?.status, err?.response?.data);
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(AUTH_DATA_KEY);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, [
    isAuthPage,
    isTokenFresh,
    ensureValidAccessToken,
    readAuthData,
    setUser,
    setAccessToken,
    setIsAuthLoading,
    setIsTokenReady,
    hasInitializedRef,
  ]);
}

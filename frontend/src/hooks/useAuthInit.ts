import { useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import {
  AUTH_DATA_KEY,
} from '../auth/constants';

interface UseAuthInitParams {
  isAuthPage: boolean;
  hasHydrated: boolean;
  isTokenFresh: () => boolean;
  ensureValidAccessToken: () => Promise<string | null>;
  readAuthData: () => { accessToken: string; user: unknown } | null;
  setUser: (user: unknown | null) => void;
  setAccessToken: (token: string | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setIsTokenReady: (ready: boolean) => void;
  hasInitializedRef: React.MutableRefObject<boolean>;
}

export function useAuthInit({
  isAuthPage,
  hasHydrated,
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
    if (!hasHydrated) {
      return;
    }

    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    if (isAuthPage) {
      setIsAuthLoading(false);
      return;
    }

    const stored = readAuthData();

    if (stored?.accessToken && isTokenFresh()) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${stored.accessToken}`;
      setAccessToken(stored.accessToken);
      setUser(stored.user);
      setIsTokenReady(true);
      setIsAuthLoading(false);
      return;
    }

    ensureValidAccessToken()
      .then((token) => {
        if (token) {
          const latest = readAuthData();
          if (latest?.accessToken) {
            setAccessToken(latest.accessToken);
            setUser(latest.user);
            setIsTokenReady(true);
          }
        }
      })
      .catch(() => {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(AUTH_DATA_KEY);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasHydrated,
    isAuthPage,
    isTokenFresh,
    ensureValidAccessToken,
    readAuthData,
    setUser,
    setAccessToken,
    setIsAuthLoading,
    setIsTokenReady,
  ]);
}

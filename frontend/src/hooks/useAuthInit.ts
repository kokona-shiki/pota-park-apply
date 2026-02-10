import { useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import {
  AUTH_DATA_KEY,
} from '../auth/constants';

interface UseAuthInitParams {
  isAuthPage: boolean;
  isTokenFresh: (token: string) => boolean;
  ensureValidAccessToken: () => Promise<string | null>;
  readAuthData: () => { accessToken: string; user: unknown } | null;
  setUser: (user: unknown | null) => void;
  setAccessToken: (token: string | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
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
  hasInitializedRef,
}: UseAuthInitParams) {
  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    if (isAuthPage) {
      setIsAuthLoading(false);
      return;
    }

    const stored = readAuthData();

    if (stored?.accessToken && isTokenFresh(stored.accessToken)) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${stored.accessToken}`;
      setAccessToken(stored.accessToken);
      setUser(stored.user);
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
          }
        }
      })
      .catch((err) => {
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
  ]);
}

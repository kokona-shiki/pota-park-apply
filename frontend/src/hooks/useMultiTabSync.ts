import { useEffect } from 'react';
import { AuthPayloadSchema } from '../../../shared/schemas/auth';
import {
  AUTH_DATA_KEY,
  LOGOUT_BROADCAST_KEY,
  REFRESH_LOCK_KEY,
} from '../auth/constants';
import { safeParseJsonWithSchema } from '../utils/parseJson';

interface UseMultiTabSyncParams {
  setUser: (user: unknown | null) => void;
  setAccessToken: (token: string | null) => void;
  rejectAllWaiters: (err: Error) => void;
  resolveAllWaiters: (token: string | null) => void;
  readAuthData: () => { accessToken: string; user: unknown } | null;
  isTokenFresh: () => boolean;
}

const handleLogoutEvent = (
  setUser: (user: unknown | null) => void,
  setAccessToken: (token: string | null) => void,
  rejectAllWaiters: (err: Error) => void
) => {
  setUser(null);
  setAccessToken(null);
  localStorage.removeItem(AUTH_DATA_KEY);
  rejectAllWaiters(new Error('已登出'));
};

const handleAuthDataEvent = (
  newValue: string | null,
  setUser: (user: unknown | null) => void,
  setAccessToken: (token: string | null) => void,
  rejectAllWaiters: (err: Error) => void,
  resolveAllWaiters: (token: string | null) => void
) => {
  if (!newValue) {
    setUser(null);
    setAccessToken(null);
    rejectAllWaiters(new Error('认证信息被清除'));
    return;
  }

  const parsed = safeParseJsonWithSchema(AuthPayloadSchema, newValue);
  if (!parsed) {
    setAccessToken(null);
    setUser(null);
    rejectAllWaiters(new Error('认证信息解析失败'));
    return;
  }
  setAccessToken(parsed.accessToken);
  setUser(parsed.user);

  resolveAllWaiters(parsed.accessToken || null);
};

const handleRefreshLockEvent = (
  readAuthData: () => { accessToken: string; user: unknown } | null,
  isTokenFresh: () => boolean,
  resolveAllWaiters: (token: string | null) => void,
  rejectAllWaiters: (err: Error) => void
) => {
  const latest = readAuthData();
  if (latest?.accessToken && isTokenFresh()) {
    resolveAllWaiters(latest.accessToken);
  } else {
    rejectAllWaiters(new Error('刷新锁已释放但无有效 token'));
  }
};

export function useMultiTabSync({
  setUser,
  setAccessToken,
  rejectAllWaiters,
  resolveAllWaiters,
  readAuthData,
  isTokenFresh,
}: UseMultiTabSyncParams) {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_BROADCAST_KEY) {
        handleLogoutEvent(setUser, setAccessToken, rejectAllWaiters);
        return;
      }

      if (e.key === AUTH_DATA_KEY) {
        handleAuthDataEvent(
          e.newValue,
          setUser,
          setAccessToken,
          rejectAllWaiters,
          resolveAllWaiters
        );
        return;
      }

      if (e.key === REFRESH_LOCK_KEY && e.newValue === null) {
        handleRefreshLockEvent(readAuthData, isTokenFresh, resolveAllWaiters, rejectAllWaiters);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [
    setUser,
    setAccessToken,
    rejectAllWaiters,
    resolveAllWaiters,
    readAuthData,
    isTokenFresh,
  ]);
}

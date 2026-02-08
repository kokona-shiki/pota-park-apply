import { useEffect } from 'react';
import { AuthPayloadSchema } from '../../shared/schemas/auth';
import { safeParseJsonWithSchema } from '../utils/parseJson';
import {
  AUTH_DATA_KEY,
  LOGOUT_BROADCAST_KEY,
  REFRESH_LOCK_KEY,
} from '../auth/constants';

interface UseMultiTabSyncParams {
  setUser: (user: unknown | null) => void;
  setAccessToken: (token: string | null) => void;
  rejectAllWaiters: (err: Error) => void;
  resolveAllWaiters: (token: string | null) => void;
  readAuthData: () => { accessToken: string; user: unknown } | null;
  isTokenFresh: (token: string) => boolean;
}

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
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(AUTH_DATA_KEY);
        rejectAllWaiters(new Error('已登出'));
        return;
      }

      if (e.key === AUTH_DATA_KEY) {
        if (!e.newValue) {
          setUser(null);
          setAccessToken(null);
          rejectAllWaiters(new Error('认证信息被清除'));
          return;
        }

        try {
          const parsed = AuthPayloadSchema.safeParse(JSON.parse(e.newValue));
          if (!parsed.success) {
            setAccessToken(null);
            setUser(null);
            rejectAllWaiters(new Error('认证信息解析失败'));
            return;
          }
          setAccessToken(parsed.data.accessToken);
          setUser(parsed.data.user);
          console.log('[App] 从其他标签页同步 token');
          resolveAllWaiters(parsed.data.accessToken || null);
        } catch (err) {
          console.error('[App] 解析 localStorage 失败:', err);
        }
      }

      if (e.key === REFRESH_LOCK_KEY && e.newValue === null) {
        const latest = readAuthData();
        if (latest?.accessToken && isTokenFresh(latest.accessToken)) {
          resolveAllWaiters(latest.accessToken);
        } else {
          rejectAllWaiters(new Error('刷新锁已释放但无有效 token'));
        }
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

import { useCallback, useRef } from 'react';
import {
  REFRESH_LOCK_KEY,
  LOGOUT_BROADCAST_KEY,
} from '../auth/constants';

interface UseTokenRefreshParams {
  getCurrentAccessToken: () => string | null;
  performRefreshAsLeader: () => Promise<string | null>;
  readRefreshLock: () => { owner: string; ts: number } | null;
  isLockExpired: (lock: { owner: string; ts: number }) => boolean;
  isTokenFresh: (token: string) => boolean;
  getJwtIatMs: (token: string) => number | null;
  rejectAllWaiters: (err: Error) => void;
  resolveAllWaiters: (token: string | null) => void;
  waitForTokenFromOtherTab: () => Promise<string | null>;
  tabIdRef: React.MutableRefObject<string>;
}

export function useTokenRefresh({
  getCurrentAccessToken,
  performRefreshAsLeader,
  readRefreshLock,
  isLockExpired,
  isTokenFresh,
  getJwtIatMs,
  rejectAllWaiters,
  resolveAllWaiters,
  waitForTokenFromOtherTab,
  tabIdRef,
}: UseTokenRefreshParams) {
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const ensureValidAccessToken = useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      const current = getCurrentAccessToken();
      if (current && !forceRefresh && isTokenFresh(current)) {
        return current;
      }

      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      const navAny = navigator as Navigator & { locks?: LockManager };
      if (navAny?.locks?.request) {
        const lockPromise = navAny.locks
          .request('pota_refresh_token_v1', { mode: 'exclusive' }, async () => {
            const latest = getCurrentAccessToken();

            if (latest && isTokenFresh(latest)) {
              if (!forceRefresh) return latest;

              const iatMs = getJwtIatMs(latest);
              if (iatMs && Date.now() - iatMs < 3000) return latest;
            }

            return await performRefreshAsLeader();
          });

        refreshPromiseRef.current = lockPromise.finally(() => {
          refreshPromiseRef.current = null;
        }) as unknown as Promise<string | null>;

        return refreshPromiseRef.current;
      }

      const tabId = tabIdRef.current;
      const lock = readRefreshLock();

      const canLead = !lock || lock.owner === tabId || isLockExpired(lock);

      if (canLead) {
        localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ owner: tabId, ts: Date.now() }));

        refreshPromiseRef.current = performRefreshAsLeader()
          .then((token) => {
            resolveAllWaiters(token);
            return token;
          })
          .catch((err) => {
            localStorage.removeItem(REFRESH_LOCK_KEY);
            localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
            rejectAllWaiters(err);
            throw err;
          })
          .finally(() => {
            refreshPromiseRef.current = null;
            const latest = readRefreshLock();
            if (latest?.owner === tabId) {
              localStorage.removeItem(REFRESH_LOCK_KEY);
            }
          });

        return refreshPromiseRef.current;
      }

      const token = await waitForTokenFromOtherTab();
      if (token && isTokenFresh(token)) return token;

      const latestToken = getCurrentAccessToken();
      if (latestToken && isTokenFresh(latestToken)) return latestToken;

      throw new Error('等待刷新完成后仍无有效 token');
    },
    [
      getCurrentAccessToken,
      performRefreshAsLeader,
      isTokenFresh,
      getJwtIatMs,
      readRefreshLock,
      rejectAllWaiters,
      resolveAllWaiters,
      waitForTokenFromOtherTab,
      tabIdRef,
    ]
  );

  return { ensureValidAccessToken };
}

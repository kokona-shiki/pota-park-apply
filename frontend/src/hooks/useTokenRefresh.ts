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
  isTokenFresh: () => boolean;
  getJwtIatMs: (token: string) => number | null;
  writeAuthData: (data: unknown) => void;
  rejectAllWaiters: (err: Error) => void;
  resolveAllWaiters: (token: string | null) => void;
  waitForTokenFromOtherTab: () => Promise<string | null>;
  tabIdRef: React.MutableRefObject<string>;
}

const shouldUseCurrentToken = (
  current: string | null,
  forceRefresh: boolean,
  isTokenFresh: () => boolean
): boolean => {
  return current !== null && !forceRefresh && isTokenFresh();
};

const refreshWithLock = async (
  getCurrentAccessToken: () => string | null,
  isTokenFresh: () => boolean,
  getJwtIatMs: (token: string) => number | null,
  performRefreshAsLeader: () => Promise<string | null>,
  forceRefresh: boolean
): Promise<string | null> => {
  const latest = getCurrentAccessToken();

  if (latest && isTokenFresh()) {
    if (!forceRefresh) return latest;

    const iatMs = getJwtIatMs(latest);
    if (iatMs && Date.now() - iatMs < 3000) return latest;
  }

  return await performRefreshAsLeader();
};

const refreshWithLocalStorageLock = async (
  tabId: string,
  readRefreshLock: () => { owner: string; ts: number } | null,
  isLockExpired: (lock: { owner: string; ts: number }) => boolean,
  performRefreshAsLeader: () => Promise<string | null>,
  rejectAllWaiters: (err: Error) => void,
  resolveAllWaiters: (token: string | null) => void
): Promise<string | null> => {
  const lock = readRefreshLock();
  const canLead = !lock || lock.owner === tabId || isLockExpired(lock);

  if (!canLead) {
    return null;
  }

  localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ owner: tabId, ts: Date.now() }));

  return performRefreshAsLeader()
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
      const latest = readRefreshLock();
      if (latest?.owner === tabId) {
        localStorage.removeItem(REFRESH_LOCK_KEY);
      }
    });
};

const waitForTokenFromOtherTabs = async (
  waitForTokenFromOtherTab: () => Promise<string | null>,
  getCurrentAccessToken: () => string | null,
  isTokenFresh: () => boolean
): Promise<string | null> => {
  const token = await waitForTokenFromOtherTab();
  if (token && isTokenFresh()) return token;

  const latestToken = getCurrentAccessToken();
  if (latestToken && isTokenFresh()) return latestToken;

  throw new Error('等待刷新完成后仍无有效 token');
};

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
      if (shouldUseCurrentToken(current, forceRefresh, isTokenFresh)) {
        return current;
      }

      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      const navAny = navigator as Navigator & { locks?: LockManager };
      if (navAny?.locks?.request) {
        const lockPromise = navAny.locks
          .request('pota_refresh_token_v1', { mode: 'exclusive' }, async () => {
            return await refreshWithLock(
              getCurrentAccessToken,
              isTokenFresh,
              getJwtIatMs,
              performRefreshAsLeader,
              forceRefresh
            );
          });

        refreshPromiseRef.current = lockPromise.finally(() => {
          refreshPromiseRef.current = null;
        }) as unknown as Promise<string | null>;

        return refreshPromiseRef.current;
      }

      const tabId = tabIdRef.current;
      const lockPromise = refreshWithLocalStorageLock(
        tabId,
        readRefreshLock,
        isLockExpired,
        performRefreshAsLeader,
        rejectAllWaiters,
        resolveAllWaiters
      );

      if (lockPromise !== null) {
        refreshPromiseRef.current = lockPromise.finally(() => {
          refreshPromiseRef.current = null;
        });
        return refreshPromiseRef.current;
      }

      return waitForTokenFromOtherTabs(
        waitForTokenFromOtherTab,
        getCurrentAccessToken,
        isTokenFresh
      );
    },
    [
      getCurrentAccessToken,
      performRefreshAsLeader,
      isTokenFresh,
      getJwtIatMs,
      readRefreshLock,
      isLockExpired,
      rejectAllWaiters,
      resolveAllWaiters,
      waitForTokenFromOtherTab,
      tabIdRef,
    ]
  );

  return { ensureValidAccessToken };
}

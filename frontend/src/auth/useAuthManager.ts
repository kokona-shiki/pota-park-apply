import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { AuthPayloadSchema } from '../../shared/schemas/auth';
import { safeParseJsonWithSchema } from '../utils/parseJson';
import {
  AUTH_DATA_KEY,
  LOGOUT_BROADCAST_KEY,
  TAB_ID_KEY,
  TOKEN_EXP_SKEW_MS,
  REFRESH_LOCK_TTL_MS,
  REFRESH_WAIT_TIMEOUT_MS,
  REFRESH_LOCK_KEY,
} from './constants';
import type { AuthUser } from './context';

const JwtPayloadSchema = {
  safeParse: (data: unknown) => {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new Error('Invalid JWT payload') };
    }
    return { success: true, data: data as { exp?: number; iat?: number } };
  },
};

const RefreshLockSchema = {
  safeParse: (data: unknown) => {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new Error('Invalid refresh lock') };
    }
    return { success: true, data: data as { owner: string; ts: number } };
  },
};

type AuthData = {
  accessToken: string;
  user: AuthUser;
};

type RefreshLock = {
  owner: string;
  ts: number;
};

type TokenWaiter = {
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
  timeoutId: number;
};

function getOrCreateTabId() {
  const existing = sessionStorage.getItem(TAB_ID_KEY);
  if (existing) return existing;
  const tabId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(TAB_ID_KEY, tabId);
  return tabId;
}

function base64UrlToBase64(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(padLen);
}

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = atob(base64UrlToBase64(payload));
    const parsed = JwtPayloadSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function getJwtExpMs(token: string) {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return null;
  return exp * 1000;
}

function getJwtIatMs(token: string) {
  const payload = decodeJwtPayload(token);
  const iat = payload?.iat;
  if (typeof iat !== 'number') return null;
  return iat * 1000;
}

function isTokenFresh(token: string) {
  const expMs = getJwtExpMs(token);
  if (!expMs) return false;
  return Date.now() < expMs - TOKEN_EXP_SKEW_MS;
}

function readAuthData() {
  const raw = localStorage.getItem(AUTH_DATA_KEY);
  if (!raw) return null;
  try {
    const parsed = AuthPayloadSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeAuthData(data: AuthData) {
  localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(data));
}

function readRefreshLock(): RefreshLock | null {
  const raw = localStorage.getItem(REFRESH_LOCK_KEY);
  if (!raw) return null;
  const parsed = RefreshLockSchema.safeParse(JSON.parse(raw));
  return parsed.success && parsed.data ? parsed.data : null;
}

function isLockExpired(lock: RefreshLock) {
  return Date.now() - lock.ts > REFRESH_LOCK_TTL_MS;
}

export function useAuthManager() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isTokenReady, setIsTokenReady] = useState(false);

  const tabIdRef = useRef<string>(getOrCreateTabId());
  const waitersRef = useRef<TokenWaiter[]>([]);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    accessTokenRef.current = accessToken;

    if (accessToken) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    }
    setIsTokenReady(!!accessToken);
  }, [accessToken]);

  const rejectAllWaiters = useCallback((err: unknown) => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const w of waiters) {
      window.clearTimeout(w.timeoutId);
      w.reject(err);
    }
  }, []);

  const resolveAllWaiters = useCallback((token: string | null) => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const w of waiters) {
      window.clearTimeout(w.timeoutId);
      w.resolve(token);
    }
  }, []);

  const waitForTokenFromOtherTab = useCallback(() => {
    return new Promise<string | null>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('等待刷新超时'));
      }, REFRESH_WAIT_TIMEOUT_MS);

      waitersRef.current.push({ resolve, reject, timeoutId });
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(AUTH_DATA_KEY);
    localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
    apiClient.post('/api/logout').catch((e) => {
      console.warn('退出登录请求失败（忽略）:', e?.message || e);
    });
    rejectAllWaiters(new Error('已登出'));
  }, [rejectAllWaiters]);

  const getCurrentAccessToken = useCallback(() => {
    const stored = readAuthData()?.accessToken || null;
    return stored || accessTokenRef.current || null;
  }, []);

  const performRefreshAsLeader = useCallback(async () => {
    const response = await requestWithSchema(
      apiClient.post('/api/refresh-token', {}, { headers: { 'X-Tab-Id': tabIdRef.current } }),
      AuthPayloadSchema
    );

    if (!response.accessToken || !response.user) {
      throw new Error('刷新 token 返回数据不完整');
    }

    setAccessToken(response.accessToken);
    setUser(response.user);
    writeAuthData({ accessToken: response.accessToken, user: response.user });
    return response.accessToken;
  }, []);

  const refreshSession = useCallback(
    (ensureValidAccessToken: () => Promise<string | null>) => {
      return ensureValidAccessToken().then(() => {
        const stored = readAuthData();
        return stored ? { accessToken: stored.accessToken, user: stored.user } : null;
      });
    },
    []
  );

  return {
    user,
    setUser,
    accessToken,
    setAccessToken,
    isAuthLoading,
    setIsAuthLoading,
    isTokenReady,
    logout,
    getCurrentAccessToken,
    isTokenFresh,
    performRefreshAsLeader,
    refreshSession,
    rejectAllWaiters,
    resolveAllWaiters,
    readAuthData,
    waitForTokenFromOtherTab,
    tabIdRef,
    getJwtIatMs,
    readRefreshLock,
    isLockExpired,
    writeAuthData,
  };
}

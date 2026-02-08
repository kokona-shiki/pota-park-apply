// src/hooks/useAuthInterceptors.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { AuthPayloadSchema } from '../../shared/schemas/auth';
import { safeParseJsonWithSchema } from '../utils/json';
import { AUTH_DATA_KEY, REDIRECT_KEY, LOGOUT_BROADCAST_KEY, REFRESH_LOCK_KEY } from '../auth/constants';

interface UseAuthInterceptorsParams {
  getCurrentAccessToken: () => string | null;
  isTokenFresh: (token: string) => boolean;
  ensureValidAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string | null>;
  logout: () => void;
  readAuthData: () => { accessToken: string; user: unknown } | null;
  rejectAllWaiters: (err: Error) => void;
  resolveAllWaiters: (token: string | null) => void;
}

export function useAuthInterceptors({
  getCurrentAccessToken,
  isTokenFresh,
  ensureValidAccessToken,
  logout,
  readAuthData,
  rejectAllWaiters,
  resolveAllWaiters,
}: UseAuthInterceptorsParams) {
  const navigate = useLocation();

  const isAuthRequest = (url: string) => {
    return url.includes('/api/login') || url.includes('/api/register');
  };

  const isRefreshRequest = (url: string) => {
    return url.includes('/api/refresh-token');
  };

  const isLogoutRequest = (url: string) => {
    return url.includes('/api/logout');
  };

  const isPublicRequest = (url: string) => {
    return url.includes('/api/send-verification-email') || url.includes('/api/captcha');
  };

  const shouldSkipAuth = (url: string) => {
    return isAuthRequest(url) || isRefreshRequest(url) || isLogoutRequest(url) || isPublicRequest(url);
  };

  useEffect(() => {
    const requestInterceptor = apiClient.interceptors.request.use(async (config) => {
      const url = String((config as { url?: string })?.url || '');

      if (shouldSkipAuth(url)) {
        return config;
      }

      const token = getCurrentAccessToken();
      if (token && isTokenFresh(token)) {
        (config.headers as Record<string, string>) = {
          ...(config.headers as Record<string, string>),
          Authorization: `Bearer ${token}`,
        };
        return config;
      }

      try {
        const newToken = await ensureValidAccessToken();
        if (newToken) {
          (config.headers as Record<string, string>) = {
            ...(config.headers as Record<string, string>),
            Authorization: `Bearer ${newToken}`,
          };
        }
      } catch {
      }

      return config;
    });

    const responseInterceptor = apiClient.interceptors.response.use(
      (res) => {
        const payload = res?.data as {
          code?: number;
          message?: string;
          data?: unknown;
          pagination?: unknown;
          [key: string]: unknown;
        };
        if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload) {
          if (payload.code === 0) {
            if (payload.data && typeof payload.data === 'object' && 'pagination' in payload.data) {
              return { ...res, data: payload };
            }
            return { ...res, data: payload.data };
          }

          const bizRes = { ...res, data: { ...payload, error: payload.message } };
          const bizErr: Error & {
            isBusinessError?: boolean;
            code?: number;
            response?: typeof res;
          } = new Error(payload?.message || '业务错误');
          bizErr.isBusinessError = true;
          bizErr.code = payload.code;
          bizErr.response = bizRes;
          return Promise.reject(bizErr);
        }

        return res;
      },
      (err) => {
        const status = err?.response?.status;
        const url = String(err?.config?.url || '');

        if (status !== 401 || shouldSkipAuth(url)) {
          return Promise.reject(err);
        }

        const originalRequest: {
          [key: string]: unknown;
          __retried?: boolean;
          headers?: Record<string, string>;
        } = err?.config || {};
        if (originalRequest.__retried) {
          const from = navigate;
          if (from.pathname !== '/login' && from.pathname !== '/register') {
            localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
          }
          logout();
          return Promise.reject(err);
        }

        originalRequest.__retried = true;

        return ensureValidAccessToken({ forceRefresh: true })
          .then((token) => {
            if (token) {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${token}`,
              };
            }
            return apiClient(originalRequest);
          })
          .catch((refreshErr) => {
            const from = navigate;
            if (from.pathname !== '/login' && from.pathname !== '/register') {
              localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
            }
            logout();
            return Promise.reject(refreshErr);
          });
      }
    );

    return () => {
      apiClient.interceptors.request.eject(requestInterceptor);
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, [ensureValidAccessToken, getCurrentAccessToken, isTokenFresh, logout, navigate]);
}
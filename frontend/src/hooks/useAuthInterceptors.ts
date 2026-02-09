import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import {
  REDIRECT_KEY,
} from '../auth/constants';

interface UseAuthInterceptorsParams {
  getCurrentAccessToken: () => string | null;
  isTokenFresh: (token: string) => boolean;
  ensureValidAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string | null>;
  logout: () => void;
}

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

const handleResponseSuccess = (res: unknown) => {
  const payload = res as {
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
};

const handleResponseError = (
  err: unknown,
  locationRef: React.MutableRefObject<Location>,
  ensureValidAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string | null>,
  logout: () => void,
  navigate: ReturnType<typeof useNavigate>
) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const url = String((err as { config?: { url?: string } })?.config?.url || '');

  if (status !== 401 || shouldSkipAuth(url)) {
    return Promise.reject(err);
  }

  const originalRequest: {
    [key: string]: unknown;
    __retried?: boolean;
    headers?: Record<string, string>;
  } = (err as { config?: { [key: string]: unknown } })?.config || {};
  if (originalRequest.__retried) {
    const from = locationRef.current;
    if (from.pathname !== '/login' && from.pathname !== '/register') {
      localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
    }
    logout();
    navigate('/login', { replace: true, state: { from, reason: '未登录或登录已失效' } });
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
      const from = locationRef.current;
      if (from.pathname !== '/login' && from.pathname !== '/register') {
        localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
      }
      logout();
      navigate('/login', { replace: true, state: { from, reason: '未登录或登录已失效' } });
      return Promise.reject(refreshErr);
    });
};

export function useAuthInterceptors({
  getCurrentAccessToken,
  isTokenFresh,
  ensureValidAccessToken,
  logout,
}: UseAuthInterceptorsParams) {
  const navigate = useNavigate();
  const locationRef = useRef(window.location);

  useEffect(() => {
    const updateLocation = () => {
      locationRef.current = window.location;
    };
    window.addEventListener('popstate', updateLocation);
    return () => window.removeEventListener('popstate', updateLocation);
  }, []);

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
      } catch (err) {
        console.error('Token refresh failed:', err);
      }

      return config;
    });

    const responseInterceptor = apiClient.interceptors.response.use(
      handleResponseSuccess,
      (err) => handleResponseError(err, locationRef, ensureValidAccessToken, logout, navigate)
    );

    return () => {
      apiClient.interceptors.request.eject(requestInterceptor);
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, [ensureValidAccessToken, getCurrentAccessToken, isTokenFresh, logout, navigate]);
}

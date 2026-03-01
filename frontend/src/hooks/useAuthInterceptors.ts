import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '../services/apiClient';
import { REDIRECT_KEY } from '../auth/constants';

interface UseAuthInterceptorsParams {
  getCurrentAccessToken: () => string | null;
  isTokenFresh: () => boolean;
  ensureValidAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string | null>;
  logout: (navigate?: () => void) => void;
}

interface AuthRefreshError extends Error {
  __authRefreshFailed: true;
}

const createAuthRefreshError = (): AuthRefreshError => {
  const err = new Error('Token 刷新失败，请重新登录') as AuthRefreshError;
  err.__authRefreshFailed = true;
  return err;
};

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
  return (
    isAuthRequest(url) || isRefreshRequest(url) || isLogoutRequest(url) || isPublicRequest(url)
  );
};

interface SuccessResponse {
  code: number;
  data: unknown;
  pagination?: unknown;
}

const isSuccessResponse = (payload: unknown): payload is SuccessResponse => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'code' in payload &&
    (payload as { code?: unknown }).code === 0
  );
};

const createBusinessError = (res: unknown, payload: { code?: number; message?: string }): Error => {
  const bizRes = {
    ...(typeof res === 'object' && res !== null ? res : {}),
    data: { ...payload, error: payload.message },
  };
  const bizErr: Error & {
    isBusinessError?: boolean;
    code?: number;
    response?: typeof res;
  } = new Error(payload?.message || '业务错误');
  bizErr.isBusinessError = true;
  bizErr.code = payload.code;
  bizErr.response = bizRes;
  return bizErr;
};

const handleResponseSuccess = (
  res: AxiosResponse<unknown, unknown, object>
): AxiosResponse<unknown, unknown, object> | Promise<AxiosResponse<unknown, unknown, object>> => {
  const payload = res.data as {
    code?: number;
    message?: string;
    data?: unknown;
    pagination?: unknown;
    [key: string]: unknown;
  };

  if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload) {
    if (isSuccessResponse(payload)) {
      if (payload.data && typeof payload.data === 'object' && 'pagination' in payload.data) {
        return { ...res, data: payload };
      }
      return { ...res, data: payload.data };
    }

    return Promise.reject(createBusinessError(res, payload));
  }

  return res;
};

const shouldHandleAuthError = (status: number | undefined, url: string): boolean => {
  return status === 401 && !shouldSkipAuth(url);
};

const handleTokenRefreshFailure = (
  locationRef: React.MutableRefObject<Location>,
  logout: (navigate?: () => void) => void,
  navigate: ReturnType<typeof useNavigate>
): void => {
  const from = locationRef.current;
  if (from.pathname !== '/login' && from.pathname !== '/register') {
    localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
  }
  logout(() =>
    navigate('/login', { replace: true, state: { from, reason: '未登录或登录已失效' } })
  );
};

const updateAuthHeader = (
  request: { headers?: Record<string, string> },
  token: string | null
): void => {
  if (token) {
    request.headers = {
      ...(request.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
};

const handleResponseError = (
  err: unknown,
  locationRef: React.MutableRefObject<Location>,
  ensureValidAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string | null>,
  logout: () => void,
  navigate: ReturnType<typeof useNavigate>
) => {
  if ((err as AuthRefreshError).__authRefreshFailed) {
    return Promise.reject(err);
  }

  const status = (err as { response?: { status?: number } })?.response?.status;
  const url = String((err as { config?: { url?: string } })?.config?.url || '');

  if (!shouldHandleAuthError(status, url)) {
    return Promise.reject(err);
  }

  const originalRequest: {
    [key: string]: unknown;
    __retried?: boolean;
    headers?: Record<string, string>;
  } = (err as { config?: { [key: string]: unknown } })?.config || {};

  if (originalRequest.__retried) {
    handleTokenRefreshFailure(locationRef, logout, navigate);
    return Promise.reject(err);
  }

  originalRequest.__retried = true;

  return ensureValidAccessToken({ forceRefresh: true })
    .then((token) => {
      updateAuthHeader(originalRequest, token);
      return apiClient(originalRequest);
    })
    .catch((refreshErr) => {
      handleTokenRefreshFailure(locationRef, logout, navigate);
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

  const getCurrentAccessTokenRef = useRef(getCurrentAccessToken);
  const isTokenFreshRef = useRef(isTokenFresh);
  const ensureValidAccessTokenRef = useRef(ensureValidAccessToken);
  const logoutRef = useRef(logout);

  useEffect(() => {
    getCurrentAccessTokenRef.current = getCurrentAccessToken;
    isTokenFreshRef.current = isTokenFresh;
    ensureValidAccessTokenRef.current = ensureValidAccessToken;
    logoutRef.current = logout;
  }, [ensureValidAccessToken, getCurrentAccessToken, isTokenFresh, logout]);

  useEffect(() => {
    const updateLocation = () => {
      locationRef.current = window.location;
    };
    window.addEventListener('popstate', updateLocation);
    return () => window.removeEventListener('popstate', updateLocation);
  }, []);

  useEffect(() => {
    const addAuthHeader = (config: InternalAxiosRequestConfig, token: string) => {
      config.headers.set('Authorization', `Bearer ${token}`);
    };

    const handleTokenRefresh = async (config: InternalAxiosRequestConfig) => {
      const newToken = await ensureValidAccessTokenRef.current();
      if (newToken) {
        addAuthHeader(config, newToken);
        return newToken;
      }
      throw new Error('Token 刷新失败');
    };

    const requestInterceptor = apiClient.interceptors.request.use(async (config) => {
      const url = String((config as { url?: string })?.url || '');

      if (shouldSkipAuth(url)) {
        return config;
      }

      const token = getCurrentAccessTokenRef.current();
      const tokenFresh = isTokenFreshRef.current();

      if (token && tokenFresh) {
        addAuthHeader(config, token);
        return config;
      }

      try {
        await handleTokenRefresh(config);
        return config;
      } catch {
        handleTokenRefreshFailure(locationRef, logoutRef.current, navigate);
        throw createAuthRefreshError();
      }
    });

    const responseInterceptor = apiClient.interceptors.response.use(handleResponseSuccess, (err) =>
      handleResponseError(err, locationRef, ensureValidAccessTokenRef.current, logoutRef.current, navigate)
    );

    return () => {
      apiClient.interceptors.request.eject(requestInterceptor);
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);
}

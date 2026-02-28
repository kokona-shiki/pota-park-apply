import { useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { safeParseJsonWithSchema } from './utils/parseJson';
import { z } from 'zod';
import { Box, Toolbar, Typography } from '@mui/material';
import TopBar from './components/TopBar';
import SideBar from './components/SideBar';
import { PopupNotification } from './components/PopupNotification';
import { AuthContext } from './auth/context';
import type { AuthUser } from './auth/context';
import { useAuthInterceptors } from './hooks/useAuthInterceptors';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { useMultiTabSync } from './hooks/useMultiTabSync';
import { useAuthInit } from './hooks/useAuthInit';
import { AppRoutes } from './AppRoutes';
import { useAuthStore } from './store';

function getJwtIatMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = parts[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const json = atob(base64 + '='.repeat(padLen));

  const JwtPayloadSchema = z.object({
    iat: z.number(),
  });

  const parsed = safeParseJsonWithSchema(JwtPayloadSchema, json);
  if (!parsed) return null;
  return parsed.iat * 1000;
}

// 在模块加载时生成唯一的 tabId
const tabId = Math.random().toString(36).substring(2, 9);

function LoadingState() {
  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
    >
      <Typography>加载中...</Typography>
    </Box>
  );
}

function isAuthPage(pathname: string) {
  return pathname === '/login' || pathname === '/register';
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const hasInitializedRef = useRef(false);

  const {
    user,
    accessToken,
    isAuthLoading,
    isTokenReady,
    _hasHydrated,
    setUser,
    setAccessToken,
    setIsAuthLoading,
    setIsTokenReady,
    logout,
    refreshSession,
    getCurrentAccessToken,
    isTokenFresh,
  } = useAuthStore();

  const readAuthData = useCallback((): { accessToken: string; user: unknown } | null => {
    const { user, accessToken } = useAuthStore.getState();
    if (!user && !accessToken) return null;
    return { user, accessToken } as { accessToken: string; user: unknown };
  }, []);

  const stableSetUser = useCallback(
    (user: unknown | null) => setUser(user as AuthUser | null),
    [setUser]
  );
  const stableSetAccessToken = useCallback(
    (token: string | null) => setAccessToken(token),
    [setAccessToken]
  );
  const stableSetIsAuthLoading = useCallback(
    (loading: boolean) => setIsAuthLoading(loading),
    [setIsAuthLoading]
  );

  // 使用模块级别的 tabId 变量
  const tabIdRef = useRef(tabId);

  const { ensureValidAccessToken } = useTokenRefresh({
    getCurrentAccessToken,
    performRefreshAsLeader: async () => {
      await refreshSession();
      const data = readAuthData();
      return data?.accessToken || null;
    },
    readRefreshLock: () => null,
    isLockExpired: () => true,
    isTokenFresh,
    getJwtIatMs,
    writeAuthData: (data: unknown) => {
      if (data && typeof data === 'object' && 'user' in data) setUser(data.user as AuthUser | null);
      if (data && typeof data === 'object' && 'accessToken' in data)
        setAccessToken(data.accessToken as string);
    },
    rejectAllWaiters: () => {},
    resolveAllWaiters: () => {},
    waitForTokenFromOtherTab: () => Promise.resolve(null),
    tabIdRef,
  });

  useAuthInterceptors({
    getCurrentAccessToken,
    isTokenFresh,
    ensureValidAccessToken,
    logout,
  });

  useMultiTabSync({
    setUser: stableSetUser,
    setAccessToken: stableSetAccessToken,
    rejectAllWaiters: () => {},
    resolveAllWaiters: () => {},
    readAuthData,
    isTokenFresh,
  });

  useAuthInit({
    isAuthPage: isAuthPage(location.pathname),
    hasHydrated: _hasHydrated,
    isTokenFresh,
    ensureValidAccessToken,
    readAuthData,
    setUser: stableSetUser,
    setAccessToken: stableSetAccessToken,
    setIsAuthLoading: stableSetIsAuthLoading,
    setIsTokenReady,
    hasInitializedRef,
  });

  const currentIsAuthPage = isAuthPage(location.pathname);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        refreshSession: () => refreshSession(),
        logout,
        isAuthLoading,
        isTokenReady,
      }}
    >
      {isAuthLoading ? (
        <LoadingState />
      ) : (
        <AppContent
          isAuthPage={currentIsAuthPage}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          user={user}
        />
      )}
      <PopupNotification />
    </AuthContext.Provider>
  );
}

function AppContent({
  isAuthPage,
  isSidebarOpen,
  setIsSidebarOpen,
  user,
}: {
  isAuthPage: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  user: { permissions?: string[] } | null;
}) {
  return (
    <Box sx={{ display: 'flex' }}>
      {!isAuthPage && <TopBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />}
      {!isAuthPage && (
        <SideBar
          isOpen={isSidebarOpen}
          isAdmin={!!user && user.permissions?.includes('review_application') === true}
          isSysAdmin={!!user && user.permissions?.includes('view_all_users') === true}
          isPotaRepresentative={!!user && user.permissions?.includes('pota_import') === true}
        />
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {!isAuthPage && <Toolbar />}
        <AppRoutes />
      </Box>
    </Box>
  );
}

export default App;

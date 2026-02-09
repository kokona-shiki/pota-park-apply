import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
    setUser,
    setAccessToken,
    setIsAuthLoading,
    logout,
    refreshSession,
    getCurrentAccessToken,
    isTokenFresh,
    readAuthData,
  } = useAuthStore();

  const { ensureValidAccessToken } = useTokenRefresh({
    getCurrentAccessToken,
    performRefreshAsLeader: async () => {
      await refreshSession();
      const { accessToken } = readAuthData();
      return accessToken;
    },
    readRefreshLock: () => null, // Zustand 持久化已经处理了状态同步
    isLockExpired: () => true,
    isTokenFresh,
    getJwtIatMs: () => Date.now(),
    writeAuthData: (data: any) => {
      if (data.user) setUser(data.user as AuthUser | null);
      if (data.accessToken) setAccessToken(data.accessToken);
    },
    rejectAllWaiters: () => {},
    resolveAllWaiters: () => {},
    waitForTokenFromOtherTab: () => Promise.resolve(null),
    tabIdRef: { current: Math.random().toString(36).substr(2, 9) },
  });

  useAuthInterceptors({
    getCurrentAccessToken,
    isTokenFresh,
    ensureValidAccessToken,
    logout,
  });

  useMultiTabSync({
    setUser: (user) => setUser(user as AuthUser | null),
    setAccessToken,
    rejectAllWaiters: () => {},
    resolveAllWaiters: () => {},
    readAuthData: () => {
      const { user, accessToken } = useAuthStore.getState();
      return { user, accessToken } as { accessToken: string; user: unknown } | null;
    },
    isTokenFresh,
  });

  useAuthInit({
    isAuthPage: isAuthPage(location.pathname),
    isTokenFresh,
    ensureValidAccessToken,
    readAuthData: () => {
      const { user, accessToken } = useAuthStore.getState();
      return { user, accessToken } as { accessToken: string; user: unknown } | null;
    },
    setUser: (user) => setUser(user as AuthUser | null),
    setAccessToken,
    setIsAuthLoading,
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
      {!isAuthPage && (
        <TopBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      )}
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

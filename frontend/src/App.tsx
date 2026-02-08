import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Toolbar, Typography } from '@mui/material';
import TopBar from './components/TopBar';
import SideBar from './components/SideBar';
import { PopupNotification } from './components/PopupNotification';
import { AuthContext } from './auth/context';
import { useAuthManager } from './auth/useAuthManager';
import { useAuthInterceptors } from './hooks/useAuthInterceptors';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { useMultiTabSync } from './hooks/useMultiTabSync';
import { useAuthInit } from './hooks/useAuthInit';
import { AppRoutes } from './AppRoutes';

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
  const [isTokenReady, setIsTokenReady] = useState(false);

  const authManager = useAuthManager();

  const { ensureValidAccessToken } = useTokenRefresh({
    getCurrentAccessToken: authManager.getCurrentAccessToken,
    performRefreshAsLeader: authManager.performRefreshAsLeader,
    readRefreshLock: authManager.readRefreshLock,
    isLockExpired: authManager.isLockExpired,
    isTokenFresh: authManager.isTokenFresh,
    getJwtIatMs: authManager.getJwtIatMs,
    writeAuthData: authManager.writeAuthData,
    rejectAllWaiters: authManager.rejectAllWaiters,
    resolveAllWaiters: authManager.resolveAllWaiters,
    waitForTokenFromOtherTab: authManager.waitForTokenFromOtherTab,
    tabIdRef: authManager.tabIdRef,
  });

  useAuthInterceptors({
    getCurrentAccessToken: authManager.getCurrentAccessToken,
    isTokenFresh: authManager.isTokenFresh,
    ensureValidAccessToken,
    logout: authManager.logout,
  });

  useMultiTabSync({
    setUser: authManager.setUser,
    setAccessToken: authManager.setAccessToken,
    rejectAllWaiters: authManager.rejectAllWaiters,
    resolveAllWaiters: authManager.resolveAllWaiters,
    readAuthData: authManager.readAuthData,
    isTokenFresh: authManager.isTokenFresh,
  });

  useAuthInit({
    isAuthPage: isAuthPage(location.pathname),
    isTokenFresh: authManager.isTokenFresh,
    ensureValidAccessToken,
    readAuthData: authManager.readAuthData,
    setUser: authManager.setUser,
    setAccessToken: authManager.setAccessToken,
    setIsAuthLoading: authManager.setIsAuthLoading,
    setIsTokenReady,
    hasInitializedRef,
  });

  const currentIsAuthPage = isAuthPage(location.pathname);

  return (
    <AuthContext.Provider
      value={{
        user: authManager.user,
        setUser: authManager.setUser,
        accessToken: authManager.accessToken,
        setAccessToken: authManager.setAccessToken,
        refreshSession: () => authManager.refreshSession(ensureValidAccessToken),
        logout: authManager.logout,
        isAuthLoading: authManager.isAuthLoading,
        isTokenReady,
      }}
    >
      {authManager.isAuthLoading ? (
        <LoadingState />
      ) : (
        <AppContent
          isAuthPage={currentIsAuthPage}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          user={authManager.user}
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

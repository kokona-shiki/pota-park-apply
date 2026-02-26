import { useAuthStore } from '../store';

export function useAuth() {
  const {
    user,
    accessToken,
    isAuthLoading,
    isTokenReady,
    _hasHydrated,
    setUser,
    setAccessToken,
    logout,
    refreshSession,
  } = useAuthStore();
  
  return {
    user,
    accessToken,
    isAuthLoading,
    isTokenReady,
    hasHydrated: _hasHydrated,
    setUser,
    setAccessToken,
    logout,
    refreshSession,
  };
}

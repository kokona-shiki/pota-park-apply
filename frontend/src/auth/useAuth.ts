import { useAuthStore } from '../store';

export function useAuth() {
  const {
    user,
    accessToken,
    isAuthLoading,
    isTokenReady,
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
    setUser,
    setAccessToken,
    logout,
    refreshSession,
  };
}

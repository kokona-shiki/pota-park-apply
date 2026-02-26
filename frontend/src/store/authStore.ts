import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { z } from 'zod';
import type { AuthUser } from '../auth/context';
import { authService } from '../services';
import { safeParseJsonWithSchema } from '../utils/parseJson';

interface AuthState {
  // 状态
  user: AuthUser | null;
  accessToken: string | null;
  isAuthLoading: boolean;
  isTokenReady: boolean;
  _hasHydrated: boolean;

  // 操作
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (token: string | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setIsTokenReady: (ready: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: (navigate?: () => void) => void;
  refreshSession: () => Promise<void>;
  getCurrentAccessToken: () => string | null;
  isTokenFresh: () => boolean;
  readAuthData: () => { user: AuthUser | null; accessToken: string | null };
  writeAuthData: (data: { user: AuthUser | null; accessToken: string | null }) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      accessToken: null,
      isAuthLoading: true,
      isTokenReady: false,
      _hasHydrated: false,

      // 操作
      setUser: (user) => set({ user }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

      setIsTokenReady: (isTokenReady) => set({ isTokenReady }),

      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),

      login: async (email, password) => {
        try {
          set({ isAuthLoading: true });
          const user = await authService.login({ identifier: email, password });
          set({ user, isAuthLoading: false, isTokenReady: true });
          return user;
        } catch (error) {
          set({ isAuthLoading: false });
          throw error;
        }
      },

      logout: (navigate) => {
        set({ user: null, accessToken: null, isTokenReady: false });
        localStorage.removeItem('pota_auth_data');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pota_logout'));
        }
        if (navigate) {
          navigate();
        }
      },

      refreshSession: async () => {
        try {
          set({ isAuthLoading: true });
          const result = await authService.refreshToken();
          set({
            user: result.user,
            accessToken: result.accessToken,
            isAuthLoading: false,
            isTokenReady: true,
          });
        } catch (error) {
          set({ isAuthLoading: false, isTokenReady: false });
          get().logout();
          throw error;
        }
      },

      getCurrentAccessToken: () => {
        return get().accessToken;
      },

      isTokenFresh: () => {
        const token = get().accessToken;
        if (!token) return false;

        try {
          const payloadStr = atob(token.split('.')[1]);
          const jwtPayloadSchema = z.object({
            exp: z.number(),
          });
          const payload = safeParseJsonWithSchema(jwtPayloadSchema, payloadStr);
          if (!payload) return false;
          const now = Date.now() / 1000;
          return payload.exp > now;
        } catch {
          return false;
        }
      },

      readAuthData: () => {
        const { user, accessToken } = get();
        return { user, accessToken };
      },

      writeAuthData: (data) => {
        set({ user: data.user, accessToken: data.accessToken });
      },
    }),
    {
      name: 'pota-auth-storage',
      storage: createJSONStorage(() => localStorage as StateStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useAuthStore;

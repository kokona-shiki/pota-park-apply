import { createContext } from 'react';
import type { AuthUser } from '../../../shared/schemas/auth';

export type { AuthUser };

export type AuthContextValue = {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  accessToken: string | null;
  setAccessToken: (t: string | null) => void;
  refreshSession: () => Promise<unknown>;
  logout: () => void;
  isAuthLoading: boolean;
  isTokenReady: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const LOGOUT_BROADCAST_KEY = 'pota_logout';
export const REDIRECT_KEY = 'pota_redirect_after_login';
export const AUTH_DATA_KEY = 'pota_auth_data';

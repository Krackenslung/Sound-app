import { createContext, useContext } from 'react';
import type { Me } from '@/api/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: Me | null;
  isPremium: boolean;
  /** Premium, or plan unknown — try the player and let the SDK's account_error decide. */
  playbackAllowed: boolean;
  /** Plan is known and isn't Premium. */
  knownNonPremium: boolean;
  error: Error | null;
  retry: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

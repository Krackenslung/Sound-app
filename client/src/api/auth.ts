import { clearAutoLogin, loggedOutMode } from '@/features/auth/loggedOut';
import { useDemoStore } from '@/features/demo/demoStore';
import { api, isApiError } from './client';

export interface Me {
  id: string;
  displayName: string;
  email: string | null;
  /** `null` when Spotify doesn't report it (Development Mode apps after Feb 2026). */
  product: 'premium' | 'free' | 'open' | string | null;
  country: string | null;
  avatarUrl: string | null;
  /** The server is in owner mode: it always acts as this account, so there's no logging out. */
  ownerMode?: boolean;
}

export { LOGIN_URL } from '@/features/auth/loggedOut';

/**
 * Current user, or `null` when not logged in. What happens to a logged-out
 * visitor depends on `loggedOutMode()`: demo mode, or `null` (→ login page,
 * which in the default `spotify` mode redirects to Spotify login). A server without Spotify credentials
 * always gives demo mode.
 */
export async function fetchMe(): Promise<Me | null> {
  try {
    const me = await api<Me>('/me');
    clearAutoLogin();
    return me;
  } catch (e) {
    // Owner mode with an expired saved login: an error to show, not a login to start.
    if (!isApiError(e, 401) || e.code === 'OWNER_TOKEN_EXPIRED') throw e;
    const mode = loggedOutMode();
    if (e.code === 'LOGIN_NOT_CONFIGURED' || mode === 'demo') {
      useDemoStore.getState().setEnabled(true);
      return api<Me>('/me');
    }
    // `spotify` mode: the login page redirects to Spotify (see LoginPage).
    return null;
  }
}

export function logout(): Promise<void> {
  return api<void>('/auth/logout', { method: 'POST' });
}

export function fetchAccessToken(): Promise<{ accessToken: string; expiresAt: number }> {
  return api('/auth/token');
}

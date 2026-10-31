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
}

export const LOGIN_URL = '/api/auth/login';

/**
 * Current user, or `null` when not logged in. When the server has no Spotify
 * credentials, login can't work, so this switches to demo mode and returns the
 * demo user instead.
 */
export async function fetchMe(): Promise<Me | null> {
  try {
    return await api<Me>('/me');
  } catch (e) {
    if (isApiError(e, 401) && e.code === 'LOGIN_NOT_CONFIGURED') {
      useDemoStore.getState().setEnabled(true);
      return api<Me>('/me');
    }
    if (isApiError(e, 401)) return null;
    throw e;
  }
}

export function logout(): Promise<void> {
  return api<void>('/auth/logout', { method: 'POST' });
}

export function fetchAccessToken(): Promise<{ accessToken: string; expiresAt: number }> {
  return api('/auth/token');
}

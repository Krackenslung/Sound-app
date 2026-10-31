/**
 * What a logged-out visitor gets (VITE_LOGGED_OUT):
 * - `spotify` (default): sent straight to Spotify login. After the first approval
 *   Spotify returns immediately, so it feels like being logged in by default.
 * - `demo`: the app in demo mode, with "Log in with Spotify" in the account menu.
 * - `login`: the login page (Continue with Spotify / Explore demo mode).
 * A server without Spotify credentials always falls back to demo mode, and a
 * login error from Spotify always shows the login page with the reason.
 */
export type LoggedOutMode = 'spotify' | 'demo' | 'login';

export function loggedOutMode(): LoggedOutMode {
  const v = import.meta.env.VITE_LOGGED_OUT;
  return v === 'demo' || v === 'login' ? v : 'spotify';
}

export const LOGIN_URL = '/api/auth/login';
const LAST_AUTO_LOGIN = 'pulse.autoLogin';
const LOOP_WINDOW_MS = 60_000;

/**
 * True if we auto-redirected to Spotify in the last minute and are logged out
 * again: the session cookie isn't sticking, so another redirect would loop.
 */
export function autoLoginWouldLoop(): boolean {
  try {
    const last = Number(sessionStorage.getItem(LAST_AUTO_LOGIN));
    return Boolean(last) && Date.now() - last < LOOP_WINDOW_MS;
  } catch {
    return false;
  }
}

/** Redirects to Spotify login, remembering when (see `autoLoginWouldLoop`). */
export function autoLogin() {
  try {
    sessionStorage.setItem(LAST_AUTO_LOGIN, String(Date.now()));
  } catch {
    /* storage unavailable: redirect anyway */
  }
  window.location.assign(LOGIN_URL);
}

/** Called once logged in, so a later expiry can auto-login again. */
export function clearAutoLogin() {
  try {
    sessionStorage.removeItem(LAST_AUTO_LOGIN);
  } catch {
    /* ignore */
  }
}

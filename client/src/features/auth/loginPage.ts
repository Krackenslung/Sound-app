/**
 * Whether logged-out visitors see the login page. Off by default: they go
 * straight into the app in demo mode, with "Log in with Spotify" in the account
 * menu and demo banner. Set VITE_SHOW_LOGIN=true to bring the login page back.
 * (A login error from Spotify still shows the login page with the reason.)
 */
export const loginPageEnabled = () => import.meta.env.VITE_SHOW_LOGIN === 'true';

import { useNavigate } from 'react-router';
import { LOGIN_URL } from '@/api/auth';
import { useDemo } from '@/features/demo/demoStore';
import { useAuth } from './authContext';
import { loginPageEnabled } from './loginPage';

/** The account menu's single action: log out, exit demo, or (login page off) log in from demo. */
export function useAccountAction() {
  const { logout } = useAuth();
  const demo = useDemo();
  const navigate = useNavigate();
  const loginFromDemo = demo && !loginPageEnabled();

  return {
    label: loginFromDemo ? 'Log in with Spotify' : demo ? 'Exit demo' : 'Log out',
    run: async () => {
      await logout();
      if (loginFromDemo) window.location.assign(LOGIN_URL);
      else if (loginPageEnabled()) navigate('/login', { replace: true });
      // Fresh start: the app reloads logged out and opens in demo mode.
      else window.location.assign('/');
    },
  };
}

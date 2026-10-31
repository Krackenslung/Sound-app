import { useNavigate } from 'react-router';
import { useDemo } from '@/features/demo/demoStore';
import { useAuth } from './authContext';
import { LOGIN_URL, clearAutoLogin, loggedOutMode } from './loggedOut';

/** The account menu's single action: log out, exit demo, or log in from demo. */
export function useAccountAction() {
  const { logout } = useAuth();
  const demo = useDemo();
  const navigate = useNavigate();
  const mode = loggedOutMode();
  const loginFromDemo = demo && mode !== 'login';

  return {
    label: loginFromDemo ? 'Log in with Spotify' : demo ? 'Exit demo' : 'Log out',
    run: async () => {
      await logout();
      if (loginFromDemo) {
        clearAutoLogin();
        window.location.assign(LOGIN_URL);
      } else if (mode === 'login') navigate('/login', { replace: true });
      // After logging out, show demo mode; in `spotify` mode a plain reload would log straight back in.
      else window.location.assign(mode === 'spotify' ? '/?demo=1' : '/');
    },
  };
}

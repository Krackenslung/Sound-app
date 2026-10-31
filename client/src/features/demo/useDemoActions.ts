import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LOGIN_URL } from '@/api/auth';
import { usePlayerStore } from '@/store/playerStore';
import { resetDemoState } from './demoBackend';
import { useDemoStore } from './demoStore';

export function useDemoActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setEnabled = useDemoStore((s) => s.setEnabled);

  const enterDemo = useCallback(() => {
    resetDemoState();
    setEnabled(true);
    usePlayerStore.getState().reset();
    // Refetch everything (incl. /me) from the demo backend.
    void queryClient.resetQueries();
    navigate('/', { replace: true });
  }, [queryClient, navigate, setEnabled]);

  const leaveDemo = useCallback(
    (to: 'login' | 'spotify' = 'login') => {
      setEnabled(false);
      resetDemoState();
      usePlayerStore.getState().reset();
      queryClient.clear();
      if (to === 'spotify') window.location.assign(LOGIN_URL);
      else navigate('/login', { replace: true });
    },
    [queryClient, navigate, setEnabled],
  );

  return { enterDemo, leaveDemo };
}

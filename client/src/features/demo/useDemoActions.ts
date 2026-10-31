import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LOGIN_URL } from '@/api/auth';
import { usePlayerStore } from '@/store/playerStore';
import { useDemoStore } from './demoStore';

export function useDemoActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setEnabled = useDemoStore((s) => s.setEnabled);

  const enterDemo = useCallback(async () => {
    // Loaded on demand so the fixtures stay out of the main bundle.
    (await import('./demoBackend')).resetDemoState();
    setEnabled(true);
    usePlayerStore.getState().reset();
    // Refetch everything (incl. /me) from the demo backend.
    void queryClient.resetQueries();
    navigate('/', { replace: true });
  }, [queryClient, navigate, setEnabled]);

  const leaveDemo = useCallback(
    async (to: 'login' | 'spotify' = 'login') => {
      setEnabled(false);
      (await import('./demoBackend')).resetDemoState();
      usePlayerStore.getState().reset();
      queryClient.clear();
      if (to === 'spotify') window.location.assign(LOGIN_URL);
      else navigate('/login', { replace: true });
    },
    [queryClient, navigate, setEnabled],
  );

  return { enterDemo, leaveDemo };
}

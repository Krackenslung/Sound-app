import { useCallback, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, logout as apiLogout } from '@/api/auth';
import { isApiError } from '@/api/client';
import { ME_QUERY_KEY } from '@/lib/queryClient';
import { useDemoStore } from '@/features/demo/demoStore';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, staleTime: 5 * 60_000 });

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      if (useDemoStore.getState().enabled) {
        useDemoStore.getState().setEnabled(false);
        (await import('@/features/demo/demoBackend')).resetDemoState();
      }
      queryClient.setQueryData(ME_QUERY_KEY, null);
      // Drop every other user's cached data without refetching the (now null) user.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_QUERY_KEY[0] });
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    let status: AuthStatus;
    if (query.isPending) status = 'loading';
    else if (query.isError) {
      status = isApiError(query.error, 403)
        ? 'forbidden'
        : isApiError(query.error, 401) && query.error.code === 'OWNER_TOKEN_EXPIRED'
          ? 'owner_expired'
          : 'error';
    } else status = query.data ? 'authenticated' : 'unauthenticated';

    const user = query.data ?? null;
    return {
      status,
      user,
      isPremium: user?.product === 'premium',
      playbackAllowed: Boolean(user) && (user!.product === 'premium' || user!.product == null),
      knownNonPremium: Boolean(user) && user!.product != null && user!.product !== 'premium',
      error: query.error,
      retry: () => void query.refetch(),
      logout,
    };
  }, [query, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { isApiError } from '@/api/client';

export const ME_QUERY_KEY = ['me'] as const;

export function createQueryClient() {
  // Any 401 from the API means the session is gone: clear the user so protected routes send
  // the browser to /login.
  // (Owner mode's expired login instead refetches /me, which then reports it.)
  const onError = (error: unknown) => {
    if (!isApiError(error, 401)) return;
    if (error.code === 'OWNER_TOKEN_EXPIRED')
      void client.refetchQueries({ queryKey: ME_QUERY_KEY });
    else client.setQueryData(ME_QUERY_KEY, null);
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      // /me reports its own errors (and refetching it from here would loop).
      onError: (error, query) => {
        if (query.queryKey[0] !== ME_QUERY_KEY[0]) onError(error);
      },
    }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // 501 = endpoint unavailable for this app; retrying cannot help.
        retry: (count, error) =>
          count < 1 && (!isApiError(error) || (error.status >= 500 && error.status !== 501)),
      },
    },
  });
  return client;
}

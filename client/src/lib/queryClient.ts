import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { isApiError } from '@/api/client';

export const ME_QUERY_KEY = ['me'] as const;

export function createQueryClient() {
  // Any 401 from the API means the session is gone: clear the user so protected routes send
  // the browser to /login.
  const onError = (error: unknown) => {
    if (isApiError(error, 401)) client.setQueryData(ME_QUERY_KEY, null);
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
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

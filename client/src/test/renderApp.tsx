import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createQueryClient } from '@/lib/queryClient';
import { routes } from '@/routes';
import type { Me } from '@/api/auth';

export const premiumUser: Me = {
  id: 'jg',
  displayName: 'Jesus G.',
  email: 'jg@example.com',
  product: 'premium',
  country: 'MX',
  avatarUrl: null,
};

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Stubs fetch: `me` controls GET /api/me; `extra` handles anything else. */
export function mockApi({ me, extra }: { me: Me | number; extra?: Handler }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/auth/logout' && init?.method === 'POST') {
      me = 401;
      return new Response(null, { status: 204 });
    }
    if (url === '/api/me') {
      return typeof me === 'number'
        ? json({ code: me === 403 ? 'FORBIDDEN' : 'UNAUTHENTICATED', message: 'x' }, me)
        : json(me);
    }
    if (extra) return extra(url, init);
    return json({ code: 'NOT_FOUND', message: 'not mocked' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = createQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { router, queryClient };
}

import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';

// Route-level code splitting: the login page ships with just the core; the app shell and each page
// load on demand (keeps the first load light — Lighthouse Performance target).
const shell = async () => ({ Component: (await import('@/components/layout/AppShell')).AppShell });

export const routes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        lazy: shell,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/pages/HomePage')).HomePage }),
          },
          {
            path: 'now-playing',
            lazy: async () => ({
              Component: (await import('@/pages/NowPlayingPage')).NowPlayingPage,
            }),
          },
          {
            path: 'search',
            lazy: async () => ({ Component: (await import('@/pages/SearchPage')).SearchPage }),
          },
          {
            path: 'album/:id',
            lazy: async () => ({ Component: (await import('@/pages/AlbumPage')).AlbumPage }),
          },
          {
            path: 'artist/:id',
            lazy: async () => ({ Component: (await import('@/pages/ArtistPage')).ArtistPage }),
          },
          {
            path: 'library',
            lazy: async () => ({ Component: (await import('@/pages/LibraryPage')).LibraryPage }),
          },
          {
            path: 'playlist/:id',
            lazy: async () => ({ Component: (await import('@/pages/PlaylistPage')).PlaylistPage }),
          },
          {
            path: 'stats',
            lazy: async () => ({ Component: (await import('@/pages/StatsPage')).StatsPage }),
          },
          {
            path: '*',
            lazy: async () => {
              const { PlaceholderPage } = await import('@/pages/PlaceholderPage');
              return { Component: () => <PlaceholderPage title="Not found" /> };
            },
          },
        ],
      },
    ],
  },
  // Dev-only preview, reachable without logging in.
  ...(import.meta.env.DEV
    ? [
        {
          lazy: shell,
          children: [
            {
              path: 'dev/components',
              lazy: async () => ({
                Component: (await import('@/pages/ComponentsPreviewPage')).ComponentsPreviewPage,
              }),
            },
          ],
        },
      ]
    : []),
];

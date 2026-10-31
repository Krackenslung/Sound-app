import type { RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { NowPlayingPage } from '@/pages/NowPlayingPage';
import { LoginPage } from '@/pages/LoginPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { ComponentsPreviewPage } from '@/pages/ComponentsPreviewPage';

export const routes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'now-playing', element: <NowPlayingPage /> },
          { path: 'search', element: <PlaceholderPage title="Search" /> },
          { path: 'library', element: <PlaceholderPage title="Library" /> },
          { path: 'stats', element: <PlaceholderPage title="Stats" /> },
          { path: '*', element: <PlaceholderPage title="Not found" /> },
        ],
      },
    ],
  },
  // Dev-only preview, reachable without logging in.
  ...(import.meta.env.DEV
    ? [
        {
          element: <AppShell />,
          children: [{ path: 'dev/components', element: <ComponentsPreviewPage /> }],
        },
      ]
    : []),
];

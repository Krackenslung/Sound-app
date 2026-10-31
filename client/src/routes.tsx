import type { RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/pages/HomePage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { ComponentsPreviewPage } from '@/pages/ComponentsPreviewPage';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <PlaceholderPage title="Search" /> },
      { path: 'library', element: <PlaceholderPage title="Library" /> },
      { path: 'stats', element: <PlaceholderPage title="Stats" /> },
      ...(import.meta.env.DEV
        ? [{ path: 'dev/components', element: <ComponentsPreviewPage /> }]
        : []),
      { path: '*', element: <PlaceholderPage title="Not found" /> },
    ],
  },
];

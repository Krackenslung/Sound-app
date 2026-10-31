import { Navigate, Outlet, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from './authContext';

export function FullScreenLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-bg" role="status">
      <Loader2 aria-hidden className="size-8 animate-spin text-accent" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ProtectedRoute() {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (status === 'forbidden') return <Navigate to="/login?error=not_allowlisted" replace />;
  if (status === 'owner_expired') return <Navigate to="/login?error=owner_token_expired" replace />;
  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg text-center">
        <h1 className="text-h2">Can't reach the server</h1>
        <p className="text-text-secondary">Check your connection and try again.</p>
        <Button onClick={retry}>Retry</Button>
      </div>
    );
  }
  return <Outlet />;
}

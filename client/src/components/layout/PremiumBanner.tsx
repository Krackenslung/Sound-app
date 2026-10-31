import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';

export function PremiumBanner() {
  const { user, isPremium } = useAuth();
  if (!user || isPremium) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-warning bg-surface px-4 py-3"
    >
      <AlertTriangle aria-hidden className="size-5 shrink-0 text-warning" />
      <p className="text-body text-text-primary">
        <span className="font-semibold">Playback requires Spotify Premium.</span>{' '}
        <span className="text-text-secondary">
          You can still browse, search, manage your library and see your stats.
        </span>
      </p>
    </div>
  );
}

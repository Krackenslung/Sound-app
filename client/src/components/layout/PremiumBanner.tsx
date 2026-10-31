import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';
import { usePlayerStore } from '@/store/playerStore';

export function PremiumBanner() {
  const { knownNonPremium } = useAuth();
  const accountBlocked = usePlayerStore((s) => s.accountBlocked);
  if (!knownNonPremium && !accountBlocked) return null;
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

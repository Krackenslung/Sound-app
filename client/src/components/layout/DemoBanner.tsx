import { Sparkles } from 'lucide-react';
import { useDemo } from '@/features/demo/demoStore';
import { useDemoActions } from '@/features/demo/useDemoActions';

// Figma: Demo banner (node 8:1322).
export function DemoBanner() {
  const demo = useDemo();
  const { leaveDemo } = useDemoActions();
  if (!demo) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-xl border border-warning-line bg-warning-soft px-3.5 py-3"
    >
      <Sparkles aria-hidden className="size-[18px] shrink-0 text-warning" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body font-semibold text-warning">Demo mode</p>
        <p className="text-caption text-text-secondary">
          You&apos;re viewing sample data. Log in with Spotify Premium to play your own music.
        </p>
      </div>
      <button
        type="button"
        onClick={() => leaveDemo('spotify')}
        className="hidden shrink-0 rounded-full px-3 py-1.5 text-caption font-semibold text-warning hover:bg-warning-soft sm:block"
      >
        Log in with Spotify
      </button>
    </div>
  );
}

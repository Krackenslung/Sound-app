import { useEffect, useState } from 'react';
import { currentPosition, usePlayerStore } from '@/store/playerStore';

/** Playback position (ms), interpolated locally between player state events. */
export function usePlaybackPosition(intervalMs = 250): number {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const positionAt = usePlayerStore((s) => s.positionAt);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, intervalMs]);

  return currentPosition(
    { isPlaying, positionMs, positionAt, durationMs },
    Math.max(now, positionAt),
  );
}

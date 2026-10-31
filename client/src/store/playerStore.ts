import { create } from 'zustand';
import type { Image, RepeatMode } from '@/api/types';

export interface PlayerTrack {
  uri: string;
  id: string | null;
  name: string;
  durationMs: number;
  artists: { name: string; uri: string }[];
  album: { name: string; uri: string; images: Image[] };
}

/** Everything that describes "what is playing", from either the SDK or the Web API. */
export interface PlaybackSnapshot {
  track: PlayerTrack | null;
  nextTracks: PlayerTrack[];
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  shuffle: boolean;
  repeat: RepeatMode;
  contextUri: string | null;
}

export interface ActiveDevice {
  id: string | null;
  name: string;
  isLocal: boolean;
}

export type SdkStatus = 'idle' | 'loading' | 'ready' | 'not_ready' | 'error';

export interface PlayerState extends PlaybackSnapshot {
  sdkStatus: SdkStatus;
  sdkError: string | null;
  /** Device id of this browser's Web Playback SDK player. */
  deviceId: string | null;
  activeDevice: ActiveDevice | null;
  /** 0..1 */
  volume: number;
  /** `Date.now()` when `positionMs` was sampled; used to interpolate progress. */
  positionAt: number;

  setSdkStatus: (status: SdkStatus, error?: string | null) => void;
  setDeviceId: (id: string | null) => void;
  applySnapshot: (snapshot: PlaybackSnapshot, device: ActiveDevice) => void;
  clearPlayback: () => void;
  patch: (partial: Partial<PlaybackSnapshot & { volume: number }>) => void;
  setPosition: (ms: number) => void;
  reset: () => void;
}

const emptyPlayback: PlaybackSnapshot = {
  track: null,
  nextTracks: [],
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  shuffle: false,
  repeat: 'off',
  contextUri: null,
};

const initial = {
  ...emptyPlayback,
  sdkStatus: 'idle' as SdkStatus,
  sdkError: null,
  deviceId: null,
  activeDevice: null,
  volume: 0.7,
  positionAt: 0,
};

/** Single source of truth for player state. */
export const usePlayerStore = create<PlayerState>((set) => ({
  ...initial,
  setSdkStatus: (sdkStatus, sdkError = null) => set({ sdkStatus, sdkError }),
  setDeviceId: (deviceId) => set({ deviceId }),
  applySnapshot: (snapshot, activeDevice) =>
    set({ ...snapshot, activeDevice, positionAt: Date.now() }),
  clearPlayback: () => set({ ...emptyPlayback, activeDevice: null, positionAt: Date.now() }),
  patch: (partial) =>
    set((s) => {
      // Pausing/resuming must re-anchor the interpolated position.
      if (partial.isPlaying !== undefined && partial.isPlaying !== s.isPlaying) {
        return { ...partial, positionMs: currentPosition(s), positionAt: Date.now() };
      }
      return partial;
    }),
  setPosition: (positionMs) => set({ positionMs, positionAt: Date.now() }),
  reset: () => set(initial),
}));

/** Position interpolated from the last sampled position while playing. */
export function currentPosition(
  s: Pick<PlayerState, 'isPlaying' | 'positionMs' | 'positionAt' | 'durationMs'>,
  now = Date.now(),
): number {
  if (!s.isPlaying) return s.positionMs;
  const pos = s.positionMs + (now - s.positionAt);
  return s.durationMs > 0 ? Math.min(pos, s.durationMs) : pos;
}

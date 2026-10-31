import { createContext, useContext } from 'react';

export interface PlayerControls {
  /** True when this user can issue playback commands (Premium). */
  canControl: boolean;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (positionMs: number) => void;
  /** 0..1 */
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  /** Play a list of track URIs starting at `index`. */
  playTracks: (uris: string[], index?: number) => void;
  /** Play an album/playlist/artist context, optionally starting at a track. */
  playContext: (contextUri: string, offsetUri?: string) => void;
  addToQueue: (uri: string) => void;
  /** Move playback to another device, keeping the current play/pause state. */
  transferTo: (deviceId: string) => void;
}

export const PlayerControlsContext = createContext<PlayerControls | null>(null);

export function usePlayerControls(): PlayerControls {
  const ctx = useContext(PlayerControlsContext);
  if (!ctx) throw new Error('usePlayerControls must be used inside <PlayerProvider>');
  return ctx;
}

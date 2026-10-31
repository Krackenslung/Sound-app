import type { PlayerControls } from '@/features/player/playerContext';

export function mockControls(overrides: Partial<PlayerControls> = {}): PlayerControls {
  return {
    canControl: true,
    togglePlay: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    toggleShuffle: vi.fn(),
    cycleRepeat: vi.fn(),
    playTracks: vi.fn(),
    playContext: vi.fn(),
    addToQueue: vi.fn(),
    transferTo: vi.fn(),
    ...overrides,
  };
}

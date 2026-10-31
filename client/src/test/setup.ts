import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { usePlayerStore } from '@/store/playerStore';
import { useToastStore } from '@/store/toastStore';
import { useDemoStore } from '@/features/demo/demoStore';
import { resetDemoState } from '@/features/demo/demoBackend';

// Never load the real Web Playback SDK in tests.
vi.mock('@/features/player/sdk', () => ({ loadSpotifySdk: vi.fn(() => new Promise(() => {})) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  usePlayerStore.getState().reset();
  useToastStore.setState({ toasts: [] });
  sessionStorage.clear();
  useDemoStore.setState({ enabled: false });
  resetDemoState();
});

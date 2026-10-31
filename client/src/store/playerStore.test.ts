import { currentPosition, usePlayerStore } from './playerStore';

describe('currentPosition', () => {
  it('interpolates while playing and clamps to the duration', () => {
    const s = { isPlaying: true, positionMs: 1000, positionAt: 10_000, durationMs: 5000 };
    expect(currentPosition(s, 12_000)).toBe(3000);
    expect(currentPosition(s, 99_000)).toBe(5000);
  });

  it('does not move while paused', () => {
    expect(
      currentPosition(
        { isPlaying: false, positionMs: 1000, positionAt: 0, durationMs: 5000 },
        9999,
      ),
    ).toBe(1000);
  });
});

describe('playerStore', () => {
  it('re-anchors the position when pausing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    usePlayerStore.setState({
      isPlaying: true,
      positionMs: 0,
      positionAt: 10_000,
      durationMs: 60_000,
    });
    vi.setSystemTime(13_000);
    usePlayerStore.getState().patch({ isPlaying: false });
    expect(usePlayerStore.getState().positionMs).toBe(3000);
    vi.useRealTimers();
  });
});

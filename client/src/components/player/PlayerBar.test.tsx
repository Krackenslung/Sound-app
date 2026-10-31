import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { PlayerControlsContext, type PlayerControls } from '@/features/player/playerContext';
import { apiTrackToPlayerTrack } from '@/features/player/mappers';
import { createQueryClient } from '@/lib/queryClient';
import { usePlayerStore } from '@/store/playerStore';
import { json } from '@/test/renderApp';
import { makeTrack } from '@/test/fixtures';
import { PlayerBar } from './PlayerBar';

function setup(overrides: Partial<PlayerControls> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => json({ 'spotify:track:t1': false })),
  );
  const controls: PlayerControls = {
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
    ...overrides,
  };
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <PlayerControlsContext.Provider value={controls}>
          <PlayerBar />
        </PlayerControlsContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return controls;
}

function playTrack(extra: Partial<ReturnType<typeof usePlayerStore.getState>> = {}) {
  const track = apiTrackToPlayerTrack(makeTrack(1));
  usePlayerStore.setState({
    track,
    isPlaying: true,
    positionMs: 72_000,
    positionAt: Date.now(),
    durationMs: 227_000,
    activeDevice: { id: 'web', name: 'This browser', isLocal: true },
    ...extra,
  });
}

describe('PlayerBar', () => {
  it('shows an empty state with disabled controls when nothing is playing', () => {
    setup();
    expect(screen.getByText('Nothing playing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeDisabled();
  });

  it('shows the current track and wires every control', async () => {
    playTrack();
    const c = setup();
    expect(screen.getByRole('link', { name: 'Track 1' })).toHaveAttribute('href', '/now-playing');
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('1:12')).toBeInTheDocument();
    expect(screen.getByText('3:47')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await userEvent.click(screen.getByRole('button', { name: 'Shuffle' }));
    await userEvent.click(screen.getByRole('button', { name: 'Repeat: off' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(c.togglePlay).toHaveBeenCalledOnce();
    expect(c.next).toHaveBeenCalledOnce();
    expect(c.previous).toHaveBeenCalledOnce();
    expect(c.toggleShuffle).toHaveBeenCalledOnce();
    expect(c.cycleRepeat).toHaveBeenCalledOnce();
    expect(c.setVolume).toHaveBeenCalledWith(0);

    fireEvent.change(screen.getByRole('slider', { name: 'Seek' }), { target: { value: '120000' } });
    expect(c.seek).toHaveBeenCalledWith(120000);
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '40' } });
    expect(c.setVolume).toHaveBeenCalledWith(0.4);
  });

  it('commits a seek only when the drag ends', () => {
    playTrack();
    const c = setup();
    const seek = screen.getByRole('slider', { name: 'Seek' });
    fireEvent.pointerDown(seek);
    fireEvent.change(seek, { target: { value: '30000' } });
    fireEvent.change(seek, { target: { value: '60000' } });
    expect(c.seek).not.toHaveBeenCalled();
    fireEvent.pointerUp(seek);
    expect(c.seek).toHaveBeenCalledExactlyOnceWith(60000);
  });

  it('highlights shuffle and repeat when active (accent color)', () => {
    playTrack({ shuffle: true, repeat: 'track' });
    setup();
    expect(screen.getByRole('button', { name: 'Shuffle' })).toHaveClass('text-accent');
    expect(screen.getByRole('button', { name: 'Shuffle' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Repeat: track' })).toHaveClass('text-accent');
  });

  it('shows the remote device and disables controls without Premium', () => {
    playTrack({ activeDevice: { id: 'p', name: "Jesus's iPhone", isLocal: false } });
    setup({ canControl: false });
    expect(screen.getByText("Playing on Jesus's iPhone")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute(
      'title',
      'Requires Spotify Premium',
    );
  });
});

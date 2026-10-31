import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadSpotifySdk } from './sdk';
import { usePlayerStore } from '@/store/playerStore';
import { json, mockApi, premiumUser, renderApp } from '@/test/renderApp';

type Listener = (arg: unknown) => void;

class FakePlayer {
  static last: FakePlayer | undefined;
  listeners = new Map<string, Listener>();
  connect = vi.fn(async () => true);
  disconnect = vi.fn();
  togglePlay = vi.fn(async () => {});
  nextTrack = vi.fn(async () => {});
  previousTrack = vi.fn(async () => {});
  seek = vi.fn(async () => {});
  setVolume = vi.fn(async () => {});
  activateElement = vi.fn(async () => {});
  constructor(public options: Spotify.PlayerInit) {
    FakePlayer.last = this;
  }
  addListener(event: string, cb: Listener) {
    this.listeners.set(event, cb);
  }
  async emit(event: string, arg?: unknown) {
    await act(async () => {
      await this.listeners.get(event)!(arg);
    });
  }
}

const sdkTrack = {
  uri: 'spotify:track:t9',
  id: 't9',
  name: 'Neon Avenue',
  duration_ms: 227000,
  artists: [{ name: 'The Midnight Coast', uri: 'spotify:artist:a', url: '' }],
  album: { name: 'Afterglow City', uri: 'spotify:album:al', images: [] },
};

function sdkState(paused = false) {
  return {
    paused,
    position: 1000,
    duration: 227000,
    shuffle: false,
    repeat_mode: 0,
    context: { uri: 'spotify:album:al' },
    track_window: { current_track: sdkTrack, previous_tracks: [], next_tracks: [] },
  };
}

function setup(remote: unknown = null) {
  vi.stubGlobal('Spotify', { Player: FakePlayer });
  vi.mocked(loadSpotifySdk).mockResolvedValueOnce();
  return mockApi({
    me: premiumUser,
    extra: (url, init) => {
      if (url === '/api/auth/token')
        return json({ accessToken: 'tok', expiresAt: Date.now() + 3600e3 });
      if (url === '/api/player' && !init?.method) return json(remote);
      if (url.startsWith('/api/player/')) return new Response(null, { status: 204 });
      return json({ items: [] });
    },
  });
}

describe('PlayerProvider + Web Playback SDK', () => {
  beforeEach(() => {
    FakePlayer.last = undefined;
  });

  it('creates the player with a token from /api/auth/token and transfers playback on ready', async () => {
    const fetchMock = setup(null);
    renderApp('/');
    await waitFor(() => expect(FakePlayer.last).toBeDefined());
    const player = FakePlayer.last!;
    expect(player.connect).toHaveBeenCalled();

    const token = await new Promise((r) => player.options.getOAuthToken(r));
    expect(token).toBe('tok');

    await player.emit('ready', { device_id: 'web-device' });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/player/transfer',
        expect.objectContaining({ method: 'PUT' }),
      ),
    );
    const transfer = fetchMock.mock.calls.find(([u]) => u === '/api/player/transfer')!;
    expect(JSON.parse(transfer[1]!.body as string)).toEqual({
      deviceId: 'web-device',
      play: false,
    });
    expect(usePlayerStore.getState()).toMatchObject({ deviceId: 'web-device', sdkStatus: 'ready' });
  });

  it('does not steal playback that is already running on another device', async () => {
    const fetchMock = setup({
      device: { id: 'phone', name: 'Phone', type: 'Smartphone', volumePercent: 50 },
      isPlaying: true,
      progressMs: 0,
      shuffle: false,
      repeat: 'off',
      contextUri: null,
      track: null,
    });
    renderApp('/');
    await waitFor(() => expect(FakePlayer.last?.connect).toHaveBeenCalled());
    await FakePlayer.last!.emit('ready', { device_id: 'web-device' });
    await waitFor(() => expect(usePlayerStore.getState().activeDevice?.name).toBe('Phone'));
    expect(fetchMock).not.toHaveBeenCalledWith('/api/player/transfer', expect.anything());
  });

  it('mirrors player_state_changed into the store and routes controls to the SDK', async () => {
    setup(null);
    renderApp('/');
    await waitFor(() => expect(FakePlayer.last?.connect).toHaveBeenCalled());
    const player = FakePlayer.last!;
    await player.emit('ready', { device_id: 'web-device' });
    await player.emit('player_state_changed', sdkState(false));

    expect(await screen.findByRole('link', { name: 'Neon Avenue' })).toBeInTheDocument();
    expect(usePlayerStore.getState().activeDevice).toMatchObject({ isLocal: true });

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(player.togglePlay).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(player.nextTrack).toHaveBeenCalled();
    expect(player.activateElement).toHaveBeenCalled(); // first user gesture

    await player.emit('player_state_changed', null);
    expect(usePlayerStore.getState().track).toBeNull();
  });

  it('surfaces account errors (no Premium)', async () => {
    setup(null);
    renderApp('/');
    await waitFor(() => expect(FakePlayer.last?.connect).toHaveBeenCalled());
    await FakePlayer.last!.emit('account_error', { message: 'premium' });
    expect(await screen.findByText('Playback requires Spotify Premium.')).toBeInTheDocument();
    expect(usePlayerStore.getState().sdkStatus).toBe('error');
  });

  it('does not load the SDK for non-Premium users', async () => {
    vi.mocked(loadSpotifySdk).mockClear();
    mockApi({ me: { ...premiumUser, product: 'free' } });
    renderApp('/');
    await screen.findByText('Playback requires Spotify Premium.');
    expect(loadSpotifySdk).not.toHaveBeenCalled();
  });
});

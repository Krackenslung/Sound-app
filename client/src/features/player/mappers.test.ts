import { apiStateToSnapshot, NEXT_REPEAT, sdkStateToSnapshot } from './mappers';
import { makeTrack } from '@/test/fixtures';

const sdkTrack = (n: number) =>
  ({
    uri: `spotify:track:t${n}`,
    id: `t${n}`,
    name: `Track ${n}`,
    duration_ms: 180000,
    artists: [{ name: 'Artist', uri: 'spotify:artist:a', url: '' }],
    album: {
      name: 'Album',
      uri: 'spotify:album:al',
      images: [{ url: 'https://i.scdn.co/x', width: 64, height: 64 }],
    },
  }) as unknown as Spotify.Track;

describe('sdkStateToSnapshot', () => {
  it('maps the SDK state', () => {
    const snap = sdkStateToSnapshot({
      paused: false,
      position: 1200,
      duration: 180000,
      shuffle: true,
      repeat_mode: 2,
      context: { uri: 'spotify:album:al', metadata: null },
      track_window: { current_track: sdkTrack(1), previous_tracks: [], next_tracks: [sdkTrack(2)] },
    } as unknown as Spotify.PlaybackState);
    expect(snap).toMatchObject({
      isPlaying: true,
      positionMs: 1200,
      durationMs: 180000,
      shuffle: true,
      repeat: 'track',
      contextUri: 'spotify:album:al',
    });
    expect(snap.track?.uri).toBe('spotify:track:t1');
    expect(snap.track?.album.images[0].url).toBe('https://i.scdn.co/x');
    expect(snap.nextTracks.map((t) => t.uri)).toEqual(['spotify:track:t2']);
  });

  it.each([
    [0, 'off'],
    [1, 'context'],
    [2, 'track'],
  ] as const)('maps repeat_mode %s to %s', (mode, expected) => {
    const snap = sdkStateToSnapshot({
      paused: true,
      position: 0,
      duration: 1,
      shuffle: false,
      repeat_mode: mode,
      context: { uri: null },
      track_window: { current_track: sdkTrack(1), previous_tracks: [], next_tracks: [] },
    } as unknown as Spotify.PlaybackState);
    expect(snap.repeat).toBe(expected);
    expect(snap.isPlaying).toBe(false);
  });
});

describe('apiStateToSnapshot', () => {
  it('maps the Web API state', () => {
    const t = makeTrack(1);
    const snap = apiStateToSnapshot({
      device: { id: 'd', name: 'Phone', type: 'Smartphone', volumePercent: 50 },
      isPlaying: true,
      progressMs: 5000,
      shuffle: false,
      repeat: 'context',
      contextUri: null,
      track: t,
    });
    expect(snap).toMatchObject({
      isPlaying: true,
      positionMs: 5000,
      durationMs: t.durationMs,
      repeat: 'context',
    });
    expect(snap.track?.name).toBe('Track 1');
  });
});

it('cycles repeat off → context → track → off', () => {
  expect(NEXT_REPEAT.off).toBe('context');
  expect(NEXT_REPEAT.context).toBe('track');
  expect(NEXT_REPEAT.track).toBe('off');
});

import type { PlaybackState, RepeatMode, Track } from '@/api/types';
import type { PlaybackSnapshot, PlayerTrack } from '@/store/playerStore';

export function sdkTrackToPlayerTrack(t: Spotify.Track): PlayerTrack {
  return {
    uri: t.uri,
    id: t.id,
    name: t.name,
    durationMs: t.duration_ms,
    artists: t.artists.map((a) => ({ name: a.name, uri: a.uri })),
    album: {
      name: t.album.name,
      uri: t.album.uri,
      images: t.album.images.map((i) => ({
        url: i.url,
        width: i.width ?? null,
        height: i.height ?? null,
      })),
    },
  };
}

// SDK repeat_mode: 0 = off, 1 = repeat context, 2 = repeat track.
const SDK_REPEAT: Record<0 | 1 | 2, RepeatMode> = { 0: 'off', 1: 'context', 2: 'track' };

export function sdkStateToSnapshot(s: Spotify.PlaybackState): PlaybackSnapshot {
  const current = s.track_window.current_track;
  return {
    track: current ? sdkTrackToPlayerTrack(current) : null,
    nextTracks: s.track_window.next_tracks.map(sdkTrackToPlayerTrack),
    isPlaying: !s.paused,
    positionMs: s.position,
    durationMs: s.duration,
    shuffle: s.shuffle,
    repeat: SDK_REPEAT[s.repeat_mode] ?? 'off',
    contextUri: s.context?.uri ?? null,
  };
}

export function apiTrackToPlayerTrack(t: Track): PlayerTrack {
  return {
    uri: t.uri,
    id: t.id,
    name: t.name,
    durationMs: t.durationMs,
    artists: t.artists.map((a) => ({ name: a.name, uri: a.uri })),
    album: { name: t.album.name, uri: t.album.uri, images: t.album.images },
  };
}

export function apiStateToSnapshot(s: PlaybackState): PlaybackSnapshot {
  return {
    track: s.track ? apiTrackToPlayerTrack(s.track) : null,
    nextTracks: [],
    isPlaying: s.isPlaying,
    positionMs: s.progressMs,
    durationMs: s.track?.durationMs ?? 0,
    shuffle: s.shuffle,
    repeat: s.repeat,
    contextUri: s.contextUri,
  };
}

export const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = {
  off: 'context',
  context: 'track',
  track: 'off',
};

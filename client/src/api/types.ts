export interface Image {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ArtistRef {
  id: string | null;
  name: string;
  uri: string;
}

export interface AlbumRef {
  id: string | null;
  name: string;
  uri: string;
  images: Image[];
  artists: ArtistRef[];
}

export interface Track {
  id: string | null;
  uri: string;
  name: string;
  durationMs: number;
  explicit: boolean;
  artists: ArtistRef[];
  album: AlbumRef;
}

export type RepeatMode = 'off' | 'context' | 'track';

export interface PlaybackState {
  device: { id: string | null; name: string; type: string; volumePercent: number | null };
  isPlaying: boolean;
  progressMs: number;
  shuffle: boolean;
  repeat: RepeatMode;
  contextUri: string | null;
  track: Track | null;
}

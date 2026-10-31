export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  scope: string;
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email?: string;
  product?: 'premium' | 'free' | 'open' | string;
  country?: string;
  images?: SpotifyImage[];
}

export interface SpotifyArtistRef {
  id: string | null;
  name: string;
  uri: string;
}

export interface SpotifyAlbumRef {
  id: string | null;
  name: string;
  uri: string;
  images?: SpotifyImage[];
  artists?: SpotifyArtistRef[];
}

export interface SpotifyTrack {
  id: string | null;
  uri: string;
  name: string;
  duration_ms: number;
  explicit?: boolean;
  artists: SpotifyArtistRef[];
  album: SpotifyAlbumRef;
  type?: string;
}

export interface SpotifyPaging<T> {
  items: T[];
  total?: number;
  limit: number;
  offset?: number;
  next: string | null;
}

export interface SpotifyDevice {
  id: string | null;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number | null;
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice;
  shuffle_state: boolean;
  repeat_state: 'off' | 'track' | 'context';
  timestamp: number;
  progress_ms: number | null;
  is_playing: boolean;
  item: SpotifyTrack | null;
  currently_playing_type?: string;
  context?: { uri: string } | null;
}

/** `spotify:album:abc` → `abc`; `null` for anything that isn't `spotify:<type>:<id>`. */
export function idFromUri(uri: string | undefined | null, type?: string): string | null {
  const m = uri?.match(/^spotify:([a-z]+):([A-Za-z0-9]+)$/);
  if (!m || (type && m[1] !== type)) return null;
  return m[2];
}

export const albumPath = (uri: string) => {
  const id = idFromUri(uri, 'album');
  return id ? `/album/${id}` : null;
};

export const artistPath = (uri: string) => {
  const id = idFromUri(uri, 'artist');
  return id ? `/artist/${id}` : null;
};

/** https://open.spotify.com URL for a Spotify URI (incl. the Liked Songs collection). */
export function spotifyUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (/^spotify:user:[^:]+:collection$/.test(uri))
    return 'https://open.spotify.com/collection/tracks';
  const m = uri.match(/^spotify:(track|album|artist|playlist|show|episode):([A-Za-z0-9]+)$/);
  return m ? `https://open.spotify.com/${m[1]}/${m[2]}` : null;
}

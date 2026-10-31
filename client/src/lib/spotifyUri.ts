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

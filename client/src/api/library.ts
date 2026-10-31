import { api } from './client';

const MAX_PER_REQUEST = 40;
const BATCH_WINDOW_MS = 10;

type Waiter = { resolve: (v: boolean) => void; reject: (e: unknown) => void };
let pending: Map<string, Waiter[]> | null = null;

async function flush() {
  const batch = pending!;
  pending = null;
  const uris = [...batch.keys()];
  for (let i = 0; i < uris.length; i += MAX_PER_REQUEST) {
    const chunk = uris.slice(i, i + MAX_PER_REQUEST);
    try {
      const map = await api<Record<string, boolean>>(
        `/library/contains?uris=${encodeURIComponent(chunk.join(','))}`,
      );
      chunk.forEach((u) => batch.get(u)!.forEach((w) => w.resolve(Boolean(map[u]))));
    } catch (e) {
      chunk.forEach((u) => batch.get(u)!.forEach((w) => w.reject(e)));
    }
  }
}

/**
 * Whether a track is in the user's library. Calls made within a few ms of each other are
 * batched into one `/api/library/contains` request (a list of track rows needs just one call).
 */
export function isTrackSaved(uri: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!pending) {
      pending = new Map();
      setTimeout(flush, BATCH_WINDOW_MS);
    }
    const waiters = pending.get(uri) ?? [];
    waiters.push({ resolve, reject });
    pending.set(uri, waiters);
  });
}

export const saveTracks = (uris: string[]) =>
  api<void>('/library', { method: 'PUT', body: JSON.stringify({ uris }) });

export const removeTracks = (uris: string[]) =>
  api<void>('/library', { method: 'DELETE', body: JSON.stringify({ uris }) });

import { HttpError } from './errorHandler.js';

const bad = (msg: string) => new HttpError(400, 'BAD_REQUEST', msg);

export function intParam(
  raw: unknown,
  { name, min, max, fallback }: { name: string; min: number; max: number; fallback?: number },
): number {
  if (raw === undefined || raw === '') {
    if (fallback === undefined) throw bad(`${name} is required`);
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw bad(`${name} must be an integer between ${min} and ${max}`);
  }
  return n;
}

export function enumParam<T extends string>(
  raw: unknown,
  name: string,
  values: readonly T[],
  fallback?: T,
): T {
  if (raw === undefined || raw === '') {
    if (fallback === undefined) throw bad(`${name} is required`);
    return fallback;
  }
  if (!values.includes(raw as T)) throw bad(`${name} must be one of ${values.join(', ')}`);
  return raw as T;
}

export function optionalString(raw: unknown, name: string, pattern?: RegExp): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string' || raw.length > 256 || (pattern && !pattern.test(raw))) {
    throw bad(`${name} is invalid`);
  }
  return raw;
}

/** Playable contexts: album, artist, playlist, show, or a user's Liked Songs collection. */
export const SPOTIFY_URI =
  /^spotify:(album|artist|playlist|show):[A-Za-z0-9]{1,64}$|^spotify:user:[\w.-]{1,64}:collection$/;
export const TRACK_URI = /^spotify:track:[A-Za-z0-9]{1,64}$/;
export const DEVICE_ID = /^[\w-]{1,128}$/;
export const SPOTIFY_ID = /^[A-Za-z0-9]{1,64}$/;

export function idParam(raw: unknown, name = 'id'): string {
  if (typeof raw !== 'string' || !SPOTIFY_ID.test(raw)) throw bad(`${name} is invalid`);
  return raw;
}

export function uriList(
  raw: unknown,
  name: string,
  { max, pattern }: { max: number; pattern: RegExp },
): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : null;
  if (!list || list.length === 0) throw bad(`${name} is required`);
  if (list.length > max) throw bad(`${name} accepts at most ${max} items`);
  for (const u of list) {
    if (typeof u !== 'string' || !pattern.test(u)) throw bad(`${name} contains an invalid URI`);
  }
  return list as string[];
}

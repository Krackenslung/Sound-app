import type { Artist, Track } from '@/api/types';

export interface BreakdownItem {
  label: string;
  /** Whole-number percentage of all counted mentions. */
  percent: number;
}

export interface Breakdown {
  kind: 'genre' | 'artist';
  items: BreakdownItem[];
  /** Distinct genres (or artists) counted. */
  distinct: number;
}

function toBreakdown(kind: Breakdown['kind'], counts: Map<string, number>, max: number): Breakdown {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const items = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([label, n]) => ({ label, percent: total ? Math.round((n / total) * 100) : 0 }));
  return { kind, items, distinct: counts.size };
}

/**
 * Genre share across the user's top artists. Returns `null` when Spotify sent no genre data at
 * all (field removed for Development Mode apps in Feb 2026) — distinct from "no genres".
 */
export function genreBreakdown(artists: Artist[], max = 5): Breakdown | null {
  if (artists.length === 0 || artists.every((a) => a.genres === null)) return null;
  const counts = new Map<string, number>();
  for (const a of artists) for (const g of a.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
  return toBreakdown('genre', counts, max);
}

/** Fallback: share of artist credits across the user's top tracks. */
export function artistBreakdown(tracks: Track[], max = 5): Breakdown {
  const counts = new Map<string, number>();
  for (const t of tracks)
    for (const a of t.artists) counts.set(a.name, (counts.get(a.name) ?? 0) + 1);
  return toBreakdown('artist', counts, max);
}

export function averageDurationMs(tracks: Track[]): number | null {
  if (tracks.length === 0) return null;
  return tracks.reduce((sum, t) => sum + t.durationMs, 0) / tracks.length;
}

/** Spotify genres are lowercase; Figma shows them in sentence case ("Indie pop", "Lo-fi"). */
export const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

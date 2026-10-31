export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export const artistNames = (artists: { name: string }[]) => artists.map((a) => a.name).join(', ');

export function pickImage<T extends { url: string; width: number | null }>(
  images: T[] | undefined,
  minWidth: number,
): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((i) => (i.width ?? Infinity) >= minWidth) ?? sorted.at(-1))!.url;
}

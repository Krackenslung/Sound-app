import { Link } from 'react-router';
import type { Image } from '@/api/types';
import { Artwork } from '@/components/media/Artwork';

export interface ArtistCardProps {
  name: string;
  subtitle?: string;
  seed: string;
  images?: Image[];
  to?: string;
}

// Figma: ArtistCard (node 3:56) — 152px wide, 136px circular art, centered name + caption.
export function ArtistCard({ name, subtitle, seed, images, to }: ArtistCardProps) {
  const body = (
    <>
      <Artwork images={images} size={136} seed={seed} className="size-[136px] rounded-full" />
      <span className="w-full truncate text-center text-body font-semibold">{name}</span>
      {subtitle && (
        <span className="w-full truncate text-center text-caption text-text-secondary">
          {subtitle}
        </span>
      )}
    </>
  );
  const cls =
    'flex w-[152px] shrink-0 flex-col items-center gap-2.5 rounded-xl p-2 transition-colors';
  return to ? (
    <Link to={to} className={`${cls} hover:bg-surface`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

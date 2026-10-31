import { Link } from 'react-router';
import type { Image } from '@/api/types';
import { Artwork } from '@/components/media/Artwork';

// Figma: Quick picks (node 8:1338) — compact tiles on mobile Home.
export function QuickPick({
  title,
  to,
  images,
  seed,
  art,
}: {
  title: string;
  to: string;
  images?: Image[];
  seed: string;
  art?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex min-w-0 items-center gap-2.5 overflow-hidden rounded-lg bg-surface-2 pr-2 transition-colors hover:bg-surface-hover"
    >
      {art ?? <Artwork images={images} size={52} seed={seed} className="size-[52px]" />}
      <span className="truncate text-body font-semibold">{title}</span>
    </Link>
  );
}

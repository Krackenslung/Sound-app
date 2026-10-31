import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/buttonStyles';

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" role="status">
      <span className="sr-only">Loading…</span>
      <div className="flex items-end gap-8">
        <div className="size-[232px] animate-pulse rounded-2xl bg-surface" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-4 w-20 animate-pulse rounded bg-surface" />
          <div className="h-12 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-surface" />
        </div>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
      ))}
    </div>
  );
}

export function DetailError({ notFound, what }: { notFound: boolean; what: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-h1">
        {notFound ? `This ${what} isn't available` : `Couldn't load this ${what}`}
      </h1>
      <p className="text-text-secondary">
        {notFound ? 'It may have been removed from Spotify.' : 'Please try again in a moment.'}
      </p>
      <Link to="/search" className={buttonClasses('secondary')}>
        Back to Search
      </Link>
    </div>
  );
}

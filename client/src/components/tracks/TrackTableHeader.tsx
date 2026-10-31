import { Clock3 } from 'lucide-react';

// Figma: Track table header (node 7:1001) — columns line up with TrackRow.
export function TrackTableHeader({
  hideAlbum = false,
  withMenu = false,
}: {
  hideAlbum?: boolean;
  withMenu?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 pb-2.5" role="presentation">
      <span className="w-6 shrink-0 text-center text-caption text-text-muted">#</span>
      <span className="flex-1 text-overline uppercase text-text-muted">Title</span>
      {!hideAlbum && (
        <span className="hidden w-60 shrink-0 text-overline uppercase text-text-muted md:block">
          Album
        </span>
      )}
      <span className="w-[18px] shrink-0" />
      <span className="flex w-11 shrink-0 justify-end">
        <Clock3 aria-label="Duration" className="size-4 opacity-50" />
      </span>
      {withMenu && <span className="-mr-2 w-8 shrink-0" />}
    </div>
  );
}

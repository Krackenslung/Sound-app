import { useDemo } from '@/features/demo/demoStore';
import { cn } from '@/lib/cn';
import { SpotifyIcon } from './SpotifyIcon';

/** https://open.spotify.com URL for a Spotify URI (incl. the Liked Songs collection). */
export function spotifyUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (/^spotify:user:[^:]+:collection$/.test(uri))
    return 'https://open.spotify.com/collection/tracks';
  const m = uri.match(/^spotify:(track|album|artist|playlist|show|episode):([A-Za-z0-9]+)$/);
  return m ? `https://open.spotify.com/${m[1]}/${m[2]}` : null;
}

/**
 * Attribution link back to Spotify for the content on screen ("OPEN SPOTIFY" per the branding
 * guidelines). Hidden in demo mode, where the sample IDs don't exist on Spotify.
 */
export function OpenInSpotify({
  uri,
  iconOnly = false,
  className,
}: {
  uri: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const demo = useDemo();
  const href = spotifyUrl(uri);
  if (demo || !href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={iconOnly ? 'Open in Spotify' : undefined}
      title="Open in Spotify"
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full text-caption font-semibold uppercase tracking-[0.08em] text-text-secondary transition-colors hover:text-text-primary',
        !iconOnly && 'border border-border px-3 py-2',
        className,
      )}
    >
      <SpotifyIcon />
      {!iconOnly && 'Open Spotify'}
    </a>
  );
}

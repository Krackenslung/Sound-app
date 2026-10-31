import { useDemo } from '@/features/demo/demoStore';
import { cn } from '@/lib/cn';
import { spotifyUrl } from '@/lib/spotifyUri';
import { SpotifyIcon } from './SpotifyIcon';

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

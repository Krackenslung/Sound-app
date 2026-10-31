import { useNavigate } from 'react-router';
import { Disc3, ListMusic, ListPlus, UserRound } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useDemo } from '@/features/demo/demoStore';
import { spotifyUrl } from '@/components/brand/OpenInSpotify';
import { SpotifyIcon } from '@/components/brand/SpotifyIcon';
import type { MenuItem } from '@/components/ui/Menu';
import { usePlayerControls } from '@/features/player/playerContext';
import { albumPath, artistPath } from '@/lib/spotifyUri';

interface MenuTrack {
  uri: string;
  album: { uri: string };
  artists: { uri: string }[];
}

/** Standard track actions: add to queue, go to album, go to artist. */
export function useTrackMenu() {
  const navigate = useNavigate();
  const controls = usePlayerControls();
  const openAddToPlaylist = useUiStore((s) => s.openAddToPlaylist);
  const demo = useDemo();

  return (track: MenuTrack, { hideAlbum = false }: { hideAlbum?: boolean } = {}): MenuItem[] => {
    const items: MenuItem[] = [
      {
        label: 'Add to queue',
        icon: <ListPlus aria-hidden className="size-4" />,
        onSelect: () => controls.addToQueue(track.uri),
        disabled: !controls.canControl,
      },
      {
        label: 'Add to playlist',
        icon: <ListMusic aria-hidden className="size-4" />,
        onSelect: () => openAddToPlaylist([track.uri]),
      },
    ];
    const album = albumPath(track.album.uri);
    if (album && !hideAlbum) {
      items.push({
        label: 'Go to album',
        icon: <Disc3 aria-hidden className="size-4" />,
        onSelect: () => navigate(album),
      });
    }
    const artist = track.artists[0] && artistPath(track.artists[0].uri);
    if (artist) {
      items.push({
        label: 'Go to artist',
        icon: <UserRound aria-hidden className="size-4" />,
        onSelect: () => navigate(artist),
      });
    }
    const href = spotifyUrl(track.uri);
    if (href && !demo) {
      items.push({
        label: 'Open in Spotify',
        icon: <SpotifyIcon className="size-4" />,
        onSelect: () => window.open(href, '_blank', 'noopener,noreferrer'),
      });
    }
    return items;
  };
}

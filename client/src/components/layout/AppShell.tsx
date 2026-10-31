import { Outlet } from 'react-router';
import { PlayerBar } from '@/components/player/PlayerBar';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { MobileTabBar } from './MobileTabBar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Toaster } from '@/components/ui/Toaster';
import { PlayerProvider } from '@/features/player/PlayerProvider';
import { AddToPlaylistDialog } from '@/features/playlists/AddToPlaylistDialog';
import { CreatePlaylistDialog } from '@/features/playlists/CreatePlaylistDialog';
import { MonthlyPlaylistDialog } from '@/features/playlists/MonthlyPlaylistDialog';
import { DemoBanner } from './DemoBanner';
import { PremiumBanner } from './PremiumBanner';
import { Sidebar } from './Sidebar';

// Figma: 02 · Home (node 5:145) — Sidebar | Main (40px x / 32px y padding, 32px section gap), PlayerBar below.
// Below 768px (Figma 8:1320): no sidebar; mini player + bottom tab bar; 16px gutters.
export function AppShell() {
  // Render one layout, not both (avoids duplicate controls for screen readers).
  const isMobile = useIsMobile();
  return (
    <PlayerProvider>
      <div className="flex h-full flex-col bg-bg">
        <div className="flex min-h-0 flex-1">
          {!isMobile && <Sidebar />}
          <main className="flex min-w-0 flex-1 flex-col gap-[22px] overflow-y-auto px-4 pb-4 pt-6 md:gap-8 md:px-10 md:py-8">
            <DemoBanner />
            <PremiumBanner />
            <Outlet />
          </main>
        </div>
        {isMobile ? (
          <>
            <MiniPlayer />
            <MobileTabBar />
          </>
        ) : (
          <PlayerBar />
        )}
      </div>
      <Toaster />
      <AddToPlaylistDialog />
      <CreatePlaylistDialog />
      <MonthlyPlaylistDialog />
    </PlayerProvider>
  );
}

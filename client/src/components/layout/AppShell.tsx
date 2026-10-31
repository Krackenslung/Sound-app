import { Outlet } from 'react-router';
import { PlayerBar } from '@/components/player/PlayerBar';
import { PremiumBanner } from './PremiumBanner';
import { Sidebar } from './Sidebar';

// Figma: 02 · Home (node 5:145) — Sidebar | Main (40px x / 32px y padding, 32px section gap), PlayerBar below.
export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col gap-8 overflow-y-auto px-10 py-8">
          <PremiumBanner />
          <Outlet />
        </main>
      </div>
      <PlayerBar />
    </div>
  );
}

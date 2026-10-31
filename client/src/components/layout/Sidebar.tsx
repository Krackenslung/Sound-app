import { BarChart3, Home, Library, Music, Plus, Search } from 'lucide-react';
import { NavItem } from './NavItem';
import { UserCard } from './UserCard';
import { SidebarPlaylists } from './SidebarPlaylists';
import { useAuth } from '@/features/auth/authContext';
import { useUiStore } from '@/store/uiStore';

// Figma: Sidebar (node 4:12) — 248px wide, surface bg, right border.
export function Sidebar() {
  const authenticated = useAuth().status === 'authenticated';
  const openCreate = useUiStore((s) => s.openCreatePlaylist);
  return (
    <aside
      aria-label="Sidebar"
      className="hidden h-full w-sidebar shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 pb-5 pt-6 md:flex"
    >
      <div className="flex items-center gap-2.5 pl-2">
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent-2 to-50%">
          <Music aria-hidden className="size-[18px] text-on-accent" strokeWidth={2} />
        </span>
        <span className="text-h2">Pulse</span>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        <NavItem to="/" label="Home" icon={Home} end />
        <NavItem to="/search" label="Search" icon={Search} />
        <NavItem to="/library" label="Library" icon={Library} />
        <NavItem to="/stats" label="Stats" icon={BarChart3} />
      </nav>

      <hr className="border-border" />

      <div className="flex items-center justify-between pl-3.5 pr-2">
        <h2 className="text-overline uppercase text-text-muted">Your playlists</h2>
        <button
          type="button"
          aria-label="Create playlist"
          onClick={() => openCreate()}
          className="rounded-full opacity-70 hover:opacity-100"
        >
          <Plus aria-hidden className="size-[18px]" />
        </button>
      </div>

      {authenticated ? <SidebarPlaylists /> : <div className="flex-1" />}

      <UserCard />
    </aside>
  );
}

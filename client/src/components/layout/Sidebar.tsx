import { BarChart3, Home, Library, MoreHorizontal, Music, Plus, Search } from 'lucide-react';
import { NavItem } from './NavItem';

// Figma: Sidebar (node 4:12) — 248px wide, surface bg, right border.
export function Sidebar() {
  return (
    <aside
      aria-label="Sidebar"
      className="flex h-full w-sidebar shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 pb-5 pt-6"
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
          disabled
          className="rounded-full opacity-70 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus aria-hidden className="size-[18px]" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <p className="px-3.5 text-caption text-text-muted">Your playlists will appear here.</p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-2 to-warning to-50% text-body font-semibold text-on-accent">
          ?
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body font-semibold">Guest</span>
          <span className="text-caption text-text-secondary">Not signed in</span>
        </div>
        <MoreHorizontal aria-hidden className="size-[18px] opacity-60" />
      </div>
    </aside>
  );
}

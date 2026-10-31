import { NavLink } from 'react-router';
import { BarChart3, Home, Library, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const TABS: Array<[string, string, LucideIcon, boolean?]> = [
  ['/', 'Home', Home, true],
  ['/search', 'Search', Search],
  ['/library', 'Library', Library],
  ['/stats', 'Stats', BarChart3],
];

// Figma: Tab bar (node 8:1414) — the sidebar becomes this below 768px.
export function MobileTabBar() {
  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 justify-between border-t border-border bg-surface px-8 pb-[max(28px,env(safe-area-inset-bottom))] pt-2.5 md:hidden"
    >
      {TABS.map(([to, label, Icon, end]) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex min-w-14 flex-col items-center gap-1 rounded-lg',
              isActive ? 'text-accent-hover' : 'text-text-secondary',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                aria-hidden
                className={cn('size-[22px]', !isActive && 'opacity-60')}
                strokeWidth={1.8}
              />
              <span className="text-caption">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

export interface NavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Figma: NavItem (node 3:22) — active = surface-2 bg + 6px accent dot.
export function NavItem({ to, label, icon: Icon, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex h-11 w-full items-center gap-3.5 rounded-[10px] py-2.5 pl-3.5 pr-3 transition-colors',
          isActive && 'bg-surface-2',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            aria-hidden
            className={cn('size-[22px] shrink-0', isActive ? 'opacity-100' : 'opacity-60')}
            strokeWidth={1.8}
          />
          <span
            className={cn(
              'flex-1 text-body font-semibold',
              isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary',
            )}
          >
            {label}
          </span>
          {isActive && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
        </>
      )}
    </NavLink>
  );
}

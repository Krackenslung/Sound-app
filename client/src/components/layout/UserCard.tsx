import { useCallback, useId, useRef, useState } from 'react';
import { LogOut, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';
import { useAccountAction } from '@/features/auth/useAccountAction';
import { useDismiss } from '@/hooks/useDismiss';
import { useDemo } from '@/features/demo/demoStore';

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?'
  );
}

export function UserCard() {
  const { user, isPremium } = useAuth();
  const demo = useDemo();
  const account = useAccountAction();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);

  useDismiss(ref, open, close);

  const name = user?.displayName ?? 'Guest';

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-2 to-warning to-50% text-body font-semibold text-on-accent">
            {user ? initials(name) : '?'}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body font-semibold">{name}</span>
          <span
            className={
              isPremium ? 'text-caption text-accent-hover' : 'text-caption text-text-secondary'
            }
          >
            {!user
              ? 'Not signed in'
              : demo
                ? 'Demo'
                : user.product == null
                  ? 'Spotify account'
                  : isPremium
                    ? 'Premium'
                    : 'Free'}
          </span>
        </div>
        {/* Owner mode always acts as this account: nothing to log out of. */}
        {user && !user.ownerMode && (
          <button
            type="button"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((o) => !o)}
            className="rounded-full p-0.5 opacity-60 hover:opacity-100"
          >
            <MoreHorizontal aria-hidden className="size-[18px]" />
          </button>
        )}
      </div>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-surface-2 p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void account.run();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-body font-semibold text-text-primary hover:bg-surface-hover"
          >
            <LogOut aria-hidden className="size-4" />
            {account.label}
          </button>
        </div>
      )}
    </div>
  );
}

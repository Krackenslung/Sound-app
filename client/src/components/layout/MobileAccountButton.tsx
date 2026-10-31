import { useCallback, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';
import { useDemo } from '@/features/demo/demoStore';
import { useDismiss } from '@/hooks/useDismiss';

// Figma 8:1333 — account button next to the mobile greeting (the sidebar user card is hidden < 768px).
export function MobileAccountButton() {
  const { user, logout } = useAuth();
  const demo = useDemo();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        type="button"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-surface-2"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-9 object-cover" />
        ) : (
          <UserRound aria-hidden className="size-[18px]" />
        )}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 min-w-48 rounded-xl border border-border bg-surface-2 p-1 shadow-popover"
        >
          <p className="truncate px-3 py-2 text-caption text-text-secondary">{user?.displayName}</p>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              close();
              await logout();
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-body font-semibold hover:bg-surface-hover"
          >
            <LogOut aria-hidden className="size-4" />
            {demo ? 'Exit demo' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}

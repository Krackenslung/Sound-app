import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDismiss } from '@/hooks/useDismiss';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

export interface MenuProps {
  label: string;
  items: MenuItem[];
  className?: string;
  /** Where the popover opens relative to the trigger. */
  placement?: 'bottom-end' | 'top-end';
}

export function Menu({ label, items, className, placement = 'bottom-end' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex size-8 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
      >
        <MoreHorizontal aria-hidden className="size-[18px]" />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={cn(
            'absolute right-0 z-30 min-w-48 rounded-xl border border-border bg-surface-2 p-1 shadow-popover',
            placement === 'bottom-end' ? 'top-full mt-1' : 'bottom-full mb-1',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onSelect();
              }}
              className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-body font-semibold text-text-primary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

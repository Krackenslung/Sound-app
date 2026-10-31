import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

// Figma: Chip (node 3:27) — Default: surface-2 / text-primary; Selected: text-primary bg / bg-colored label.
export function Chip({ selected = false, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-body font-semibold transition-colors',
        selected
          ? 'bg-text-primary text-bg'
          : 'bg-surface-2 text-text-primary hover:bg-surface-hover',
        className,
      )}
      {...rest}
    />
  );
}

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

// Figma: Button (node 3:8) — pill, 14px/28px padding, Body Strong label.
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent-strong text-on-accent hover:bg-accent-strong-hover',
  secondary: 'border-[1.5px] border-border text-text-primary hover:bg-surface-hover',
  ghost: 'text-text-secondary hover:text-text-primary',
};

/** Classes for anything that should look like a Button (e.g. links). */
export function buttonClasses(variant: ButtonVariant = 'primary', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-3.5',
    'text-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    className,
  );
}

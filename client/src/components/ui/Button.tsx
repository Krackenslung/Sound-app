import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

// Figma: Button (node 3:8) — pill, 14px/28px padding, Body Strong label.
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border-[1.5px] border-border text-text-primary hover:bg-surface-hover',
  ghost: 'text-text-secondary hover:text-text-primary',
};

export function Button({
  variant = 'primary',
  icon,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-3.5',
        'text-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

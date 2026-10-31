import type { Config } from 'tailwindcss';

const v = (name: string) => `var(--${name})`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: v('color-bg'),
      surface: v('color-surface'),
      'surface-2': v('color-surface-2'),
      'surface-hover': v('color-surface-hover'),
      border: v('color-border'),
      'text-primary': v('color-text-primary'),
      'text-secondary': v('color-text-secondary'),
      'text-muted': v('color-text-muted'),
      accent: v('color-accent'),
      'accent-hover': v('color-accent-hover'),
      'accent-2': v('color-accent-2'),
      'accent-soft': v('color-accent-soft'),
      scrim: v('color-scrim'),
      'chart-cyan': v('color-chart-cyan'),
      'on-accent': v('color-on-accent'),
      warning: v('color-warning'),
      success: v('color-success'),
    },
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
    },
    extend: {
      fontSize: {
        display: ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '800' }],
        h1: ['32px', { lineHeight: '40px', letterSpacing: '-0.015em', fontWeight: '700' }],
        h2: ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '700' }],
        h3: ['16px', { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', letterSpacing: '0' }],
        caption: ['12px', { lineHeight: '16px', letterSpacing: '0', fontWeight: '500' }],
        overline: ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '700' }],
      },
      keyframes: {
        eq: {
          '0%, 100%': { transform: 'scaleY(0.45)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        eq: 'eq 0.9s ease-in-out infinite',
      },
      boxShadow: {
        art: v('shadow-art'),
        popover: v('shadow-popover'),
      },
      spacing: {
        sidebar: '248px',
        'player-bar': '88px',
        controls: '560px',
      },
    },
  },
  plugins: [],
} satisfies Config;

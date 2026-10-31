import { cn } from '@/lib/cn';

export type StatTone = 'accent' | 'pink' | 'success' | 'warning';

const TONE: Record<StatTone, string> = {
  accent: 'text-accent-hover',
  pink: 'text-accent-2',
  success: 'text-success',
  warning: 'text-warning',
};

// Figma: Summary tiles (node 7:1249).
export function StatTile({
  value,
  label,
  tone,
  loading,
}: {
  value: string | null;
  label: string;
  tone: StatTone;
  loading?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[14px] border border-border bg-surface px-5 py-4">
      {loading ? (
        <div className="my-1 h-8 w-2/3 animate-pulse rounded bg-surface-2" />
      ) : (
        <p
          className={cn('truncate text-h2 lg:text-h1', value ? TONE[tone] : 'text-text-muted')}
          title={value ?? undefined}
        >
          {value ?? '—'}
        </p>
      )}
      <p className="text-caption text-text-secondary">{label}</p>
    </div>
  );
}

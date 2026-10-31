import type { Breakdown } from '@/features/stats/computeStats';
import { sentenceCase } from '@/features/stats/computeStats';

// Bar colors follow the Figma frame (node 7:1347), assigned in fixed order by rank.
const BAR_COLORS = ['bg-accent', 'bg-accent-2', 'bg-warning', 'bg-success', 'bg-chart-cyan'];

export interface BreakdownCardProps {
  breakdown: Breakdown | null;
  loading?: boolean;
  footnote: string;
}

// Figma: Genre breakdown (node 7:1347) — labelled horizontal bars, share of the top item = full scale.
export function BreakdownCard({ breakdown, loading, footnote }: BreakdownCardProps) {
  const title = breakdown?.kind === 'artist' ? 'Artist breakdown' : 'Genre breakdown';
  const max = Math.max(1, ...(breakdown?.items.map((i) => i.percent) ?? [1]));

  return (
    <section
      aria-labelledby="breakdown-heading"
      className="flex w-[400px] shrink-0 flex-col gap-3 rounded-2xl border border-border bg-surface px-5 py-4"
    >
      <h2 id="breakdown-heading" className="text-h2">
        {title}
      </h2>
      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-surface-2" />
          ))}
        </div>
      ) : !breakdown || breakdown.items.length === 0 ? (
        <p className="text-body text-text-secondary">Not enough listening data yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {breakdown.items.map((item, i) => (
            <li key={item.label} className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="truncate text-body font-semibold">
                  {breakdown.kind === 'genre' ? sentenceCase(item.label) : item.label}
                </span>
                <span className="text-caption text-text-secondary">{item.percent}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded bg-surface-hover"
                role="meter"
                aria-label={item.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.percent}
              >
                <div
                  className={`h-2 rounded ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ width: `${(item.percent / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-caption text-text-muted">{footnote}</p>
    </section>
  );
}

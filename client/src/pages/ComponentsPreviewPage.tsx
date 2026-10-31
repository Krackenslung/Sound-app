import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';

const swatches = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['surface-2', 'bg-surface-2'],
  ['surface-hover', 'bg-surface-hover'],
  ['border', 'bg-border'],
  ['text-primary', 'bg-text-primary'],
  ['text-secondary', 'bg-text-secondary'],
  ['text-muted', 'bg-text-muted'],
  ['accent', 'bg-accent'],
  ['accent-hover', 'bg-accent-hover'],
  ['accent-2', 'bg-accent-2'],
  ['warning', 'bg-warning'],
  ['success', 'bg-success'],
] as const;

const typeScale = [
  ['Display', 'text-display'],
  ['H1', 'text-h1'],
  ['H2', 'text-h2'],
  ['H3', 'text-h3'],
  ['Body', 'text-body'],
  ['Body Strong', 'text-body font-semibold'],
  ['Caption', 'text-caption'],
  ['Overline', 'text-overline uppercase'],
] as const;

const filters = ['Tracks', 'Albums', 'Artists', 'Playlists'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h2">{title}</h2>
      {children}
    </section>
  );
}

export function ComponentsPreviewPage() {
  const [filter, setFilter] = useState('Tracks');

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-h1">Components</h1>
        <p className="text-text-secondary">Dev preview of base UI components and design tokens.</p>
      </header>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button icon={<Play aria-hidden className="size-4 fill-current" />}>With icon</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Chip">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
          {filters.map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Colors">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
          {swatches.map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-2">
              <div className={`h-16 rounded-xl border border-border ${cls}`} />
              <span className="text-caption text-text-secondary">--color-{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-3">
          {typeScale.map(([name, cls]) => (
            <div key={name} className="flex items-baseline gap-6">
              <span className="w-28 shrink-0 text-caption text-text-muted">{name}</span>
              <span className={cls}>The quick brown fox</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

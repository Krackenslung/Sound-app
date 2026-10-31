export function PlaceholderPage({ title }: { title: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-h1">{title}</h1>
      <p className="text-text-secondary">Coming soon.</p>
    </header>
  );
}

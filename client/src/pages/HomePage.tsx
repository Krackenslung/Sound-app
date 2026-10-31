function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-h1">{greeting()}</h1>
      <p className="text-text-secondary">Pick up where you left off.</p>
    </header>
  );
}

import { Button } from './Button';

export function LoadMore({
  hasMore,
  loading,
  onClick,
  label = 'Load more results',
}: {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
  label?: string;
}) {
  if (!hasMore) return null;
  return (
    <Button variant="secondary" className="w-full" onClick={onClick} disabled={loading}>
      {loading ? 'Loading…' : label}
    </Button>
  );
}

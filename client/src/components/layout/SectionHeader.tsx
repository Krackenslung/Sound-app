import { Link } from 'react-router';

export function SectionHeader({
  id,
  title,
  seeAllTo,
}: {
  id?: string;
  title: string;
  seeAllTo?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {seeAllTo && (
        <Link
          to={seeAllTo}
          className="rounded text-body font-semibold text-text-secondary hover:text-text-primary"
        >
          See all
        </Link>
      )}
    </div>
  );
}

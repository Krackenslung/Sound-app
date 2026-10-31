import { Fragment } from 'react';
import { Link } from 'react-router';

/** Comma-separated names, each linking to its page when it has one. */
export function EntityLinks({
  items,
  pathFor,
}: {
  items: { name: string; uri: string }[];
  pathFor: (uri: string) => string | null;
}) {
  return (
    <>
      {items.map((item, i) => {
        const to = pathFor(item.uri);
        return (
          <Fragment key={`${item.uri}-${i}`}>
            {i > 0 && ', '}
            {to ? (
              <Link to={to} className="hover:text-text-primary hover:underline">
                {item.name}
              </Link>
            ) : (
              item.name
            )}
          </Fragment>
        );
      })}
    </>
  );
}

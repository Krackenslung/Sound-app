import { useEffect, useState } from 'react';

/** Tracks a CSS media query. Returns false where matchMedia is unavailable (tests, SSR). */
export function useMediaQuery(query: string): boolean {
  const get = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Below the md breakpoint (768px): the mobile layout from Figma 8:1250 / 8:1320. */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');

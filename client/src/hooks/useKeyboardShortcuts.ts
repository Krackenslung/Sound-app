import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePlayerControls } from '@/features/player/playerContext';
import { currentPosition, usePlayerStore } from '@/store/playerStore';

export const SEEK_STEP_MS = 10_000;

/** Elements where keys belong to the element itself (typing, sliders, native button activation). */
function ownsKeys(el: EventTarget | null, key: string): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.closest('[aria-modal="true"], [role="menu"], [role="radiogroup"]')) return true;
  // Space on a focused button/link activates it — keep that for keyboard users.
  if (key === ' ' && (tag === 'BUTTON' || tag === 'A' || el.getAttribute('role') === 'button'))
    return true;
  return false;
}

/**
 * Global shortcuts: Space play/pause · ←/→ seek ±10 s · Shift+←/→ previous/next · `/` focus search.
 */
export function useKeyboardShortcuts() {
  const controls = usePlayerControls();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const focusSearch = () =>
      document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || ownsKeys(e.target, e.key))
        return;

      if (e.key === '/') {
        e.preventDefault();
        if (pathname === '/search') focusSearch();
        else {
          navigate('/search');
          setTimeout(focusSearch, 0);
        }
        return;
      }

      const s = usePlayerStore.getState();
      if (!controls.canControl || !s.track) return;

      if (e.key === ' ') {
        e.preventDefault();
        controls.togglePlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const forward = e.key === 'ArrowRight';
        if (e.shiftKey) {
          if (forward) controls.next();
          else controls.previous();
        } else {
          const pos = currentPosition(s);
          const target = forward
            ? Math.min(pos + SEEK_STEP_MS, Math.max(0, s.durationMs - 1000))
            : Math.max(0, pos - SEEK_STEP_MS);
          controls.seek(target);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [controls, navigate, pathname]);
}

import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import {
  AlertCircle,
  BarChart3,
  Music,
  Play,
  Sparkles,
  Speaker,
  type LucideIcon,
} from 'lucide-react';
import { LOGIN_URL } from '@/api/auth';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Button } from '@/components/ui/Button';
import { autoLogin, autoLoginWouldLoop, loggedOutMode } from '@/features/auth/loggedOut';
import { useAuth } from '@/features/auth/authContext';
import { FullScreenLoader } from '@/features/auth/ProtectedRoute';
import { useDemoActions } from '@/features/demo/useDemoActions';
import { cn } from '@/lib/cn';
import { SpotifyIcon } from '@/components/brand/SpotifyIcon';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Spotify login was cancelled.',
  state_mismatch: 'Your login attempt expired or was interrupted. Please try again.',
  token_exchange_failed: "We couldn't finish logging you in with Spotify. Please try again.",
  not_allowlisted:
    "Your Spotify account isn't on this app's invite list yet. Explore demo mode in the meantime.",
  session_expired: 'Your session expired. Please log in again.',
  owner_token_expired:
    'Owner mode’s saved Spotify login expired (Spotify asks again every 6 months). Run `npm run owner-token` in the terminal, then restart the server.',
  session_not_saved:
    'You logged in with Spotify, but the session didn’t stick (cookies blocked?). Try again, or explore demo mode.',
  not_configured:
    'Spotify login isn’t set up on this server: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are missing. Explore demo mode in the meantime.',
};

const FEATURES: Array<[LucideIcon, string]> = [
  [Play, 'Full playback in your browser'],
  [Speaker, 'Control any of your devices'],
  [BarChart3, 'Top tracks, artists and genres'],
];

// 3 columns × 3 tiles; the middle column is offset 40px (Figma 01 · Login, collage 5:86).
const COLLAGE = [
  [
    ['--art-1', false],
    ['--art-4', true],
    ['--art-7', false],
  ],
  [
    ['--art-2', true],
    ['--art-5', false],
    ['--art-8', true],
  ],
  [
    ['--art-3', false],
    ['--art-6', true],
    ['--art-9', false],
  ],
] as const;

// Figma: 01 · Login (node 5:83)
export function LoginPage() {
  const { status } = useAuth();
  const { enterDemo } = useDemoActions();
  const [params] = useSearchParams();
  const errorKey = params.get('error');
  // In `spotify` mode a logged-out visitor goes straight to Spotify; the login
  // page only shows errors, or when redirecting again would loop.
  const [loopDetected] = useState(autoLoginWouldLoop);
  const redirecting =
    status === 'unauthenticated' && !errorKey && !loopDetected && loggedOutMode() === 'spotify';
  useEffect(() => {
    if (redirecting) autoLogin();
  }, [redirecting]);
  const shownKey = errorKey ?? (loopDetected ? 'session_not_saved' : null);
  const error = shownKey ? (ERROR_MESSAGES[shownKey] ?? 'Something went wrong logging in.') : null;

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'authenticated' && (loggedOutMode() === 'login' || !error)) {
    return <Navigate to="/" replace />;
  }
  if (redirecting) return <FullScreenLoader />;

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-bg px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[120px] -top-[260px] size-[720px] rounded-full bg-accent opacity-30 blur-[160px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[900px] top-[420px] size-[620px] rounded-full bg-accent-2 opacity-20 blur-[160px]"
      />

      <div className="relative flex w-full max-w-[1180px] items-center justify-between gap-[140px]">
        <div aria-hidden className="hidden shrink-0 gap-5 lg:flex">
          {COLLAGE.map((column, c) => (
            <div key={c} className={cn('flex flex-col gap-5', c === 1 && 'mt-10')}>
              {column.map(([art, dim]) => (
                <div
                  key={art}
                  className={cn('size-40 rounded-2xl', dim && 'opacity-75')}
                  style={{ backgroundImage: `var(${art})` }}
                />
              ))}
            </div>
          ))}
        </div>

        <main className="flex w-full max-w-[520px] flex-col gap-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 to-50%">
              <Music aria-hidden className="size-6 text-on-accent" />
            </span>
            <span className="text-h2">Pulse Player</span>
          </div>

          <div className="flex flex-col gap-3.5">
            <h1 className="text-display">
              Your music,
              <br />
              right in the browser.
            </h1>
            <p className="text-text-secondary">
              Play, search and organize your Spotify library — then see what you&apos;ve really been
              listening to.
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {FEATURES.map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2">
                  <Icon aria-hidden className="size-4 text-accent-hover" />
                </span>
                <span className="text-body font-semibold">{label}</span>
              </li>
            ))}
          </ul>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[10px] border border-warning bg-surface px-3.5 py-2.5 text-caption text-text-primary"
            >
              <AlertCircle aria-hidden className="mt-px size-4 shrink-0 text-warning" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <a href={LOGIN_URL} className={buttonClasses('primary', 'w-full')}>
              Continue with Spotify
            </a>
            <Button variant="secondary" className="w-full" onClick={() => void enterDemo()}>
              Explore demo mode
            </Button>
          </div>

          <p className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-caption text-text-secondary">
            <Sparkles aria-hidden className="size-4 shrink-0 text-warning" />
            Playback requires Spotify Premium. Access is invite-only while the app is in
            development.
          </p>

          <p className="mt-9 flex items-center gap-2 text-caption text-text-muted">
            Content and data provided by
            <SpotifyIcon title="Spotify" />
          </p>
        </main>
      </div>
    </div>
  );
}

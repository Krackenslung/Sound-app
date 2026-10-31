import { isApiError } from '@/api/client';

/** User-facing message for a failed playback command. */
export function playerErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    if (err.status === 403) {
      return /premium/i.test(err.message)
        ? 'Playback requires Spotify Premium.'
        : "Spotify didn't allow that action right now.";
    }
    if (err.code === 'NO_ACTIVE_DEVICE') {
      return 'No active device. Open Spotify on one of your devices, or wait for this browser to connect.';
    }
    if (err.code === 'QUOTA_EXCEEDED') {
      return "This app has hit Spotify's request limit. Please try again later.";
    }
    if (err.status === 429) return 'Too many requests — give it a few seconds.';
    if (err.status >= 500) return 'Spotify is having trouble right now. Please try again.';
  }
  return 'Something went wrong talking to Spotify.';
}

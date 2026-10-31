const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
const LOAD_TIMEOUT_MS = 15_000;

let loading: Promise<void> | null = null;

/** Loads the Web Playback SDK script once and resolves when `window.Spotify` is ready. */
export function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      loading = null;
      reject(new Error('Timed out loading the Spotify player'));
    }, LOAD_TIMEOUT_MS);

    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timer);
      resolve();
    };

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      loading = null;
      script.remove();
      reject(new Error('Could not load the Spotify player'));
    };
    document.body.appendChild(script);
  });
  return loading;
}

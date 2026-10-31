import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchAccessToken } from '@/api/auth';
import { isApiError } from '@/api/client';
import { playerApi } from '@/api/player';
import { useAuth } from '@/features/auth/authContext';
import { ME_QUERY_KEY } from '@/lib/queryClient';
import { usePlayerStore } from '@/store/playerStore';
import { toast } from '@/store/toastStore';
import { playerErrorMessage } from './errors';
import { apiStateToSnapshot, NEXT_REPEAT, sdkStateToSnapshot } from './mappers';
import { PlayerControlsContext, type PlayerControls } from './playerContext';
import { loadSpotifySdk } from './sdk';

const PLAYER_NAME = 'Pulse Player (Web)';
const REMOTE_POLL_MS = 5000;
const REFRESH_AFTER_COMMAND_MS = 700;

const store = () => usePlayerStore.getState();

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { status, isPremium } = useAuth();
  const queryClient = useQueryClient();
  const playerRef = useRef<Spotify.Player | null>(null);
  const authenticated = status === 'authenticated';
  const sdkEnabled = authenticated && isPremium;

  const handleError = useCallback(
    (err: unknown) => {
      if (isApiError(err, 401)) {
        queryClient.setQueryData(ME_QUERY_KEY, null);
        return;
      }
      toast(playerErrorMessage(err));
    },
    [queryClient],
  );

  /** Pull playback state from the Web API (used when another device is playing). */
  const refreshRemote = useCallback(async () => {
    const s = store();
    if (s.activeDevice?.isLocal) return; // the SDK keeps us up to date
    try {
      const state = await playerApi.getState();
      if (!state) {
        if (!store().activeDevice?.isLocal) store().clearPlayback();
        return;
      }
      const isLocal = Boolean(state.device.id && state.device.id === store().deviceId);
      if (isLocal && playerRef.current) return; // SDK events are authoritative for this device
      store().applySnapshot(apiStateToSnapshot(state), {
        id: state.device.id,
        name: state.device.name,
        isLocal,
      });
      if (state.device.volumePercent != null)
        store().patch({ volume: state.device.volumePercent / 100 });
    } catch (err) {
      if (isApiError(err, 401)) queryClient.setQueryData(ME_QUERY_KEY, null);
      // Other polling errors are transient; stay quiet.
    }
  }, [queryClient]);

  const refreshSoon = useCallback(() => {
    setTimeout(() => void refreshRemote(), REFRESH_AFTER_COMMAND_MS);
  }, [refreshRemote]);

  // --- Web Playback SDK lifecycle -------------------------------------------------------------
  useEffect(() => {
    if (!sdkEnabled) return;
    let cancelled = false;
    let player: Spotify.Player | null = null;
    store().setSdkStatus('loading');

    const activate = () => void playerRef.current?.activateElement();
    // Browsers (mobile Safari especially) only allow audio after a user gesture.
    document.addEventListener('click', activate, { once: true, capture: true });
    document.addEventListener('keydown', activate, { once: true, capture: true });

    loadSpotifySdk()
      .then(() => {
        if (cancelled) return;
        player = new window.Spotify.Player({
          name: PLAYER_NAME,
          volume: store().volume,
          getOAuthToken: (cb) => {
            fetchAccessToken()
              .then((t) => cb(t.accessToken))
              .catch((err) => {
                if (isApiError(err, 401)) queryClient.setQueryData(ME_QUERY_KEY, null);
              });
          },
        });
        playerRef.current = player;

        player.addListener('ready', async ({ device_id }) => {
          store().setDeviceId(device_id);
          store().setSdkStatus('ready');
          // Take over playback, unless music is already playing on another device.
          try {
            const remote = await playerApi.getState();
            if (!remote || !remote.isPlaying) await playerApi.transfer(device_id, false);
            else await refreshRemote();
          } catch (err) {
            if (!isApiError(err, 404)) handleError(err);
          }
        });

        player.addListener('not_ready', () => {
          store().setDeviceId(null);
          store().setSdkStatus('not_ready', 'The browser player went offline. Reconnecting…');
          if (store().activeDevice?.isLocal) store().clearPlayback();
        });

        player.addListener('player_state_changed', (state) => {
          if (!state) {
            // Playback moved to another device.
            if (store().activeDevice?.isLocal) {
              store().clearPlayback();
              void refreshRemote();
            }
            return;
          }
          store().applySnapshot(sdkStateToSnapshot(state), {
            id: store().deviceId,
            name: 'This browser',
            isLocal: true,
          });
        });

        player.addListener('initialization_error', ({ message }) => {
          store().setSdkStatus(
            'error',
            message || 'This browser does not support Spotify playback.',
          );
          toast("This browser can't play Spotify audio. You can still control your other devices.");
        });
        player.addListener('authentication_error', () => {
          store().setSdkStatus('error', 'Spotify authentication failed.');
          void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        });
        player.addListener('account_error', () => {
          store().setSdkStatus('error', 'Playback requires Spotify Premium.');
          toast('Playback requires Spotify Premium.');
        });
        player.addListener('playback_error', ({ message }) => {
          toast(message ? `Playback error: ${message}` : 'Playback error.');
        });

        void player.connect();
      })
      .catch((err: Error) => {
        if (cancelled) return;
        store().setSdkStatus('error', err.message);
        toast(`${err.message}. You can still control your other devices.`);
      });

    return () => {
      cancelled = true;
      document.removeEventListener('click', activate, { capture: true });
      document.removeEventListener('keydown', activate, { capture: true });
      player?.disconnect();
      playerRef.current = null;
      store().reset();
    };
  }, [sdkEnabled, queryClient, handleError, refreshRemote]);

  // --- Sync with other devices (Spotify desktop/phone) ---------------------------------------
  useEffect(() => {
    if (!authenticated) return;
    void refreshRemote();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshRemote();
    }, REMOTE_POLL_MS);
    return () => clearInterval(id);
  }, [authenticated, refreshRemote]);

  // --- Controls -------------------------------------------------------------------------------
  const controls = useMemo<PlayerControls>(() => {
    /** The SDK player, only when this browser is the active device. */
    const local = () => (store().activeDevice?.isLocal ? playerRef.current : null);
    /** Target device for API commands: the remote active device, else this browser. */
    const target = () => {
      const s = store();
      if (s.activeDevice && !s.activeDevice.isLocal) return undefined;
      return s.deviceId ?? undefined;
    };
    const run = (fn: () => Promise<unknown>, { refresh = true } = {}) => {
      fn()
        .then(() => !local() && refresh && refreshSoon())
        .catch((err) => {
          handleError(err);
          refreshSoon();
        });
    };

    return {
      canControl: authenticated && isPremium,

      togglePlay: () => {
        const p = local();
        const playing = store().isPlaying;
        store().patch({ isPlaying: !playing });
        if (p) return run(() => p.togglePlay());
        run(() => (playing ? playerApi.pause(target()) : playerApi.play({ deviceId: target() })));
      },
      next: () => {
        const p = local();
        run(() => (p ? p.nextTrack() : playerApi.next(target())));
      },
      previous: () => {
        const p = local();
        run(() => (p ? p.previousTrack() : playerApi.previous(target())));
      },
      seek: (ms) => {
        const p = local();
        store().setPosition(ms);
        run(() => (p ? p.seek(ms) : playerApi.seek(ms, target())));
      },
      setVolume: (v) => {
        const volume = Math.min(1, Math.max(0, v));
        const p = local();
        store().patch({ volume });
        run(() => (p ? p.setVolume(volume) : playerApi.volume(volume * 100, target())), {
          refresh: false,
        });
      },
      toggleShuffle: () => {
        const next = !store().shuffle;
        store().patch({ shuffle: next });
        run(() => playerApi.shuffle(next, target()));
      },
      cycleRepeat: () => {
        const next = NEXT_REPEAT[store().repeat];
        store().patch({ repeat: next });
        run(() => playerApi.repeat(next, target()));
      },
      playTracks: (uris, index = 0) => {
        void playerRef.current?.activateElement();
        run(() => playerApi.play({ deviceId: target(), uris, offset: { position: index } }));
      },
      playContext: (contextUri, offsetUri) => {
        void playerRef.current?.activateElement();
        run(() =>
          playerApi.play({
            deviceId: target(),
            contextUri,
            ...(offsetUri ? { offset: { uri: offsetUri } } : {}),
          }),
        );
      },
    };
  }, [authenticated, isPremium, handleError, refreshSoon]);

  return (
    <PlayerControlsContext.Provider value={controls}>{children}</PlayerControlsContext.Provider>
  );
}

import { api } from './client';
import type { PlaybackState, RepeatMode } from './types';

const put = (path: string, body: object = {}) =>
  api<void>(`/player${path}`, { method: 'PUT', body: JSON.stringify(body) });
const post = (path: string, body: object = {}) =>
  api<void>(`/player${path}`, { method: 'POST', body: JSON.stringify(body) });

export interface PlayRequest {
  deviceId?: string;
  uris?: string[];
  contextUri?: string;
  offset?: { position: number } | { uri: string };
  positionMs?: number;
}

export const playerApi = {
  getState: () => api<PlaybackState | null>('/player'),
  transfer: (deviceId: string, play = false) => put('/transfer', { deviceId, play }),
  play: (req: PlayRequest = {}) => put('/play', req),
  pause: (deviceId?: string) => put('/pause', { deviceId }),
  next: (deviceId?: string) => post('/next', { deviceId }),
  previous: (deviceId?: string) => post('/previous', { deviceId }),
  seek: (positionMs: number, deviceId?: string) =>
    put('/seek', { positionMs: Math.round(positionMs), deviceId }),
  volume: (percent: number, deviceId?: string) =>
    put('/volume', { percent: Math.round(percent), deviceId }),
  shuffle: (state: boolean, deviceId?: string) => put('/shuffle', { state, deviceId }),
  repeat: (state: RepeatMode, deviceId?: string) => put('/repeat', { state, deviceId }),
};

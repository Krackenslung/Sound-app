import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ACCOUNTS_BASE } from '../spotify/auth.js';
import { API_BASE } from '../spotify/spotifyClient.js';

export interface MockState {
  tokenCalls: URLSearchParams[];
  tokenAuthHeaders: (string | null)[];
  apiAuthHeaders: (string | null)[];
  /** expires_in returned for every token response. */
  expiresIn: number;
  refreshCounter: number;
  rotateRefreshToken: boolean;
  refreshError?: { status: number; error: string };
  /** Queue of status codes /me should return before succeeding. */
  meFailures: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>;
  product: string;
}

export function createMockState(): MockState {
  return {
    tokenCalls: [],
    tokenAuthHeaders: [],
    apiAuthHeaders: [],
    expiresIn: 3600,
    refreshCounter: 0,
    rotateRefreshToken: false,
    refreshError: undefined,
    meFailures: [],
    product: 'premium',
  };
}

export function createSpotifyMock(state: MockState) {
  return setupServer(
    http.post(`${ACCOUNTS_BASE}/api/token`, async ({ request }) => {
      const body = new URLSearchParams(await request.text());
      state.tokenCalls.push(body);
      state.tokenAuthHeaders.push(request.headers.get('authorization'));

      if (body.get('grant_type') === 'authorization_code') {
        if (body.get('code') !== 'good-code' || !body.get('code_verifier')) {
          return HttpResponse.json({ error: 'invalid_grant' }, { status: 400 });
        }
        return HttpResponse.json({
          access_token: 'access-0',
          token_type: 'Bearer',
          scope: 'streaming',
          expires_in: state.expiresIn,
          refresh_token: 'refresh-0',
        });
      }

      if (body.get('grant_type') === 'refresh_token') {
        if (state.refreshError) {
          return HttpResponse.json(
            { error: state.refreshError.error, error_description: 'Refresh token revoked' },
            { status: state.refreshError.status },
          );
        }
        state.refreshCounter++;
        return HttpResponse.json({
          access_token: `access-${state.refreshCounter}`,
          token_type: 'Bearer',
          scope: 'streaming',
          expires_in: 3600,
          ...(state.rotateRefreshToken ? { refresh_token: `refresh-${state.refreshCounter}` } : {}),
        });
      }
      return HttpResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
    }),

    http.get(`${API_BASE}/me`, ({ request }) => {
      state.apiAuthHeaders.push(request.headers.get('authorization'));
      const failure = state.meFailures.shift();
      if (failure) {
        return HttpResponse.json(failure.body ?? { error: { status: failure.status } }, {
          status: failure.status,
          headers: failure.headers,
        });
      }
      return HttpResponse.json({
        id: 'jg',
        display_name: 'Jesus G.',
        email: 'jg@example.com',
        product: state.product,
        country: 'MX',
        images: [
          { url: 'https://i.scdn.co/image/large', width: 300, height: 300 },
          { url: 'https://i.scdn.co/image/small', width: 64, height: 64 },
        ],
      });
    }),
  );
}

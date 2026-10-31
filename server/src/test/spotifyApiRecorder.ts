import { http, HttpResponse } from 'msw';
import { API_BASE } from '../spotify/spotifyClient.js';

export interface RecordedCall {
  method: string;
  path: string;
  search: URLSearchParams;
  body: unknown;
}

/** Records every api.spotify.com call except /me; responds from `responder` (default 204). */
export function apiRecorder(
  calls: RecordedCall[],
  responder: (c: RecordedCall) => Response | undefined = () => undefined,
) {
  return http.all(`${API_BASE}/*`, async ({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname.replace('/v1', '');
    if (path === '/me') return; // fall through to the profile handler
    const text = await request.text();
    const call: RecordedCall = {
      method: request.method,
      path,
      search: url.searchParams,
      body: text ? JSON.parse(text) : undefined,
    };
    calls.push(call);
    return responder(call) ?? new HttpResponse(null, { status: 204 });
  });
}

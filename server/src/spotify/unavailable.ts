import { HttpError } from '../middleware/errorHandler.js';

/**
 * Spotify has been removing/restricting endpoints for Development Mode apps (Feb 2026). When one of
 * them answers 403/404/410, report a distinct code so the client can explain instead of erroring.
 */
export function asUnavailable(err: unknown, message: string): unknown {
  if (err instanceof HttpError && [403, 404, 410].includes(err.status)) {
    return new HttpError(501, 'ENDPOINT_UNAVAILABLE', message);
  }
  return err;
}

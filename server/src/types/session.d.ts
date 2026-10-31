import 'express-session';
import type { TokenSet } from '../spotify/types.js';

declare module 'express-session' {
  interface SessionData {
    oauth?: { state: string; verifier: string; createdAt: number };
    tokens?: TokenSet;
    /** Spotify user id, cached after the first profile lookup. */
    userId?: string;
  }
}

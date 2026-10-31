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

declare global {
  namespace Express {
    interface Request {
      /** Owner mode: the shared owner account, when this request has no user of its own. */
      owner?: import('../session/owner.js').OwnerTokens;
      /** Owner mode is on but its refresh token was rejected. */
      ownerExpired?: boolean;
    }
  }
}

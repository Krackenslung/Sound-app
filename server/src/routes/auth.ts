import { timingSafeEqual } from 'node:crypto';
import { Router, type Request } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { SESSION_COOKIE } from '../session/sessionMiddleware.js';
import { getValidAccessToken } from '../session/tokens.js';
import { buildAuthorizeUrl, createPkcePair, exchangeCode, randomToken } from '../spotify/auth.js';

const OAUTH_TTL_MS = 10 * 60 * 1000;

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function regenerate(req: Request) {
  return new Promise<void>((resolve, reject) =>
    req.session.regenerate((e) => (e ? reject(e) : resolve())),
  );
}

export function createAuthRouter(config: AppConfig) {
  const router = Router();
  const loginUrl = (error: string) =>
    `${config.appOrigin}/login?error=${encodeURIComponent(error)}`;

  router.get('/login', (req, res) => {
    const state = randomToken(16);
    const { verifier, challenge } = createPkcePair();
    req.session.oauth = { state, verifier, createdAt: Date.now() };
    res.redirect(buildAuthorizeUrl(config.spotify, { state, codeChallenge: challenge }));
  });

  router.get('/callback', async (req, res, next) => {
    try {
      const { code, state, error } = req.query as Record<string, string | undefined>;
      const oauth = req.session.oauth;
      delete req.session.oauth;

      if (error) return res.redirect(loginUrl(error));
      if (
        !code ||
        !state ||
        !oauth ||
        Date.now() - oauth.createdAt > OAUTH_TTL_MS ||
        !safeEqual(state, oauth.state)
      ) {
        return res.redirect(loginUrl('state_mismatch'));
      }

      let tokens;
      try {
        tokens = await exchangeCode(config.spotify, code, oauth.verifier);
      } catch (err) {
        console.warn('[auth] token exchange failed:', (err as Error).message);
        return res.redirect(loginUrl('token_exchange_failed'));
      }

      // New session id after login to prevent session fixation.
      await regenerate(req);
      req.session.tokens = tokens;
      req.session.save((err) => (err ? next(err) : res.redirect(`${config.appOrigin}/`)));
    } catch (err) {
      next(err);
    }
  });

  router.get('/token', requireAuth, async (req, res, next) => {
    try {
      const accessToken = await getValidAccessToken(req, config);
      res.set('Cache-Control', 'no-store');
      res.json({ accessToken, expiresAt: req.session.tokens!.expiresAt });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
      });
      res.status(204).end();
    });
  });

  return router;
}

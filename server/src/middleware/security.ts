import helmet from 'helmet';
import type { AppConfig } from '../config.js';

/**
 * Content Security Policy for the SPA + API. The built client has no inline scripts or styles,
 * so everything is 'self' except the Spotify origins the app actually needs.
 */
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  // Web Playback SDK loader; it then creates an iframe on the same host to play audio.
  scriptSrc: ["'self'", 'https://sdk.scdn.co'],
  frameSrc: ['https://sdk.scdn.co'],
  connectSrc: ["'self'", 'https://api.spotify.com'],
  // Album/artist art (i.scdn.co), playlist mosaics (mosaic.scdn.co), newer image CDN hosts.
  imgSrc: [
    "'self'",
    'data:',
    'https://i.scdn.co',
    'https://mosaic.scdn.co',
    'https://*.spotifycdn.com',
  ],
  styleSrc: ["'self'"],
  fontSrc: ["'self'"],
  manifestSrc: ["'self'"],
  mediaSrc: ["'self'"],
  workerSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
} as const;

export function securityHeaders(config: AppConfig) {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        ...CSP_DIRECTIVES,
        // Only meaningful over HTTPS (production behind Caddy).
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
    // The SDK iframe and Spotify image CDNs are cross-origin; don't require CORP from them.
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

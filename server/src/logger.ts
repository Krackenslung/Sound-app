import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import pino, { type DestinationStream, type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from './config.js';

export type { Logger };

/** Query parameters that must never reach the logs (OAuth code/state, any token). */
const SECRET_PARAMS =
  /^(code|state|access_token|refresh_token|token|code_verifier|client_secret)$/i;

/** Defence in depth: token-shaped fields are censored wherever they appear in a log object. */
export const REDACT_PATHS = [
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'code_verifier',
  'client_secret',
  'tokens',
  '*.accessToken',
  '*.refreshToken',
  '*.access_token',
  '*.refresh_token',
  '*.tokens',
  'headers.authorization',
  'headers.cookie',
  '*.headers.authorization',
  '*.headers.cookie',
  '*.headers["set-cookie"]',
];

/** `/api/auth/callback?code=abc&state=xyz` → `/api/auth/callback?code=[redacted]&state=[redacted]` */
export function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';
  const q = url.indexOf('?');
  if (q === -1) return url;
  const params = new URLSearchParams(url.slice(q + 1));
  for (const key of [...params.keys()]) if (SECRET_PARAMS.test(key)) params.set(key, '[redacted]');
  return `${url.slice(0, q)}?${params.toString().replace(/%5Bredacted%5D/g, '[redacted]')}`;
}

export function createLogger(config: AppConfig, destination?: DestinationStream): Logger {
  const level =
    process.env.LOG_LEVEL ?? (config.nodeEnv === 'test' && !destination ? 'silent' : 'info');
  const options = {
    level,
    base: { service: 'pulse-api' },
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  if (destination) return pino(options, destination);
  // Human-readable logs in local development, JSON lines everywhere else.
  if (!config.isProd && config.nodeEnv !== 'test' && process.stdout.isTTY) {
    return pino({ ...options, transport: { target: 'pino-pretty', options: { colorize: true } } });
  }
  return pino(options);
}

/**
 * Request logging. Only method, sanitised URL, status and timing are logged — never headers
 * (cookies, Authorization) or bodies.
 */
export function httpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req: IncomingMessage) => (req.headers['x-request-id'] as string) || randomUUID(),
    autoLogging: { ignore: (req: IncomingMessage) => req.url === '/api/health' },
    customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) =>
      err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    serializers: {
      req: (req: { id: string; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: sanitizeUrl(req.url),
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}

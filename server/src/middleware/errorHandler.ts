import type { ErrorRequestHandler, RequestHandler } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message ?? code);
    this.name = 'HttpError';
  }
}

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', 'Route not found'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    if (err.status === 429 && typeof err.details?.retryAfter === 'number') {
      res.set('Retry-After', String(err.details.retryAfter));
    }
    res.status(err.status).json({ code: err.code, message: err.message, ...err.details });
    return;
  }
  // body-parser errors: oversized and malformed JSON bodies.
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'INVALID_JSON', message: 'Request body is not valid JSON' });
    return;
  }
  const status = typeof err?.status === 'number' ? err.status : 500;
  // Only the error itself is logged (pino serialises name/message/stack) — never request data.
  if (status >= 500) req.log?.error({ err }, 'unhandled error');
  res.status(status).json({
    code: status >= 500 ? 'INTERNAL' : 'BAD_REQUEST',
    message: status >= 500 ? 'Internal server error' : String(err?.message ?? 'Bad request'),
  });
};

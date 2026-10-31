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

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    if (err.status === 429 && typeof err.details?.retryAfter === 'number') {
      res.set('Retry-After', String(err.details.retryAfter));
    }
    res.status(err.status).json({ code: err.code, message: err.message, ...err.details });
    return;
  }
  const status = typeof err?.status === 'number' ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    code: status >= 500 ? 'INTERNAL' : 'BAD_REQUEST',
    message: status >= 500 ? 'Internal server error' : String(err?.message ?? 'Bad request'),
  });
};

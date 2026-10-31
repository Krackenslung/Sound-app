import type { RequestHandler } from 'express';
import { HttpError } from './errorHandler.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.session.tokens) return next(new HttpError(401, 'UNAUTHENTICATED', 'Not logged in'));
  next();
};

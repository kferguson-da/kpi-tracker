import type { ErrorRequestHandler, RequestHandler } from 'express';
import { config } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

// Unmatched routes — keep the same envelope shape as real errors.
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
};

// Central error translator (must keep all four args so Express treats it as an
// error handler). Known HttpErrors map to their status; anything else is a 500
// whose internals are never leaked to the client outside development.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  console.error('Unhandled error:', err);
  const message = config.isProduction
    ? 'Internal server error'
    : err instanceof Error
      ? err.message
      : String(err);
  res.status(500).json({ error: { code: 'INTERNAL', message } });
};

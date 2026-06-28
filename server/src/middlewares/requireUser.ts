import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { unauthorized } from '../utils/httpError.js';

// The authenticated user attached by `authenticate`.
export type AuthUser = NonNullable<Request['user']>;

// A controller that is guaranteed to run behind `requireUser`, so req.user is present.
export type AuthedRequestHandler = (
  req: Request & { user: AuthUser },
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

// Route guard: makes "this route needs an authenticated user" explicit at the
// route definition and narrows req.user for the handler. `authenticate` already
// populates req.user app-wide; this keeps the requirement (and its type) at the
// route rather than as a defensive check inside the controller.
export const requireUser =
  (handler: AuthedRequestHandler): RequestHandler =>
  (req, res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    Promise.resolve(handler(req as Request & { user: AuthUser }, res, next)).catch(next);
  };

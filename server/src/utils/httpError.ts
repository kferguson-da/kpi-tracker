// Domain errors that carry an HTTP status. Controllers and middleware throw
// these; the central errorHandler translates them into the response envelope
// { error: { code, message } }. Anything that is NOT an HttpError becomes a 500.
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST') =>
  new HttpError(400, code, message);
export const unauthorized = (message = 'Unauthorized', code = 'UNAUTHORIZED') =>
  new HttpError(401, code, message);
export const forbidden = (message = 'Forbidden', code = 'FORBIDDEN') =>
  new HttpError(403, code, message);
export const notFound = (message = 'Not found', code = 'NOT_FOUND') =>
  new HttpError(404, code, message);
export const conflict = (message: string, code = 'CONFLICT') => new HttpError(409, code, message);

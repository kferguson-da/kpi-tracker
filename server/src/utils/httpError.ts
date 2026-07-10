// A thrown HttpError is translated to its status code by the global error handler.
// Anything else becomes a 500 with a generic message.
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

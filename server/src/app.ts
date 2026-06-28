import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

// Builds the Express app without starting it, so tests can import it directly
// (see __tests__/api). Routers and the `authenticate` guard mount here in later
// slices; for now only the public liveness probe is wired up.
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  // Liveness probe — the only unauthenticated route (see plan §4.2).
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

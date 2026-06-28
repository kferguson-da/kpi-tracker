import express, { Router } from 'express';
import { authenticate } from './middlewares/authenticate.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { meRouter } from './routes/me.routes.js';

// Builds the Express app without starting it, so tests can import it directly
// (see __tests__/api). Domain routers mount on the authenticated /api router.
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  // Liveness probe — the only unauthenticated route (see plan §4.2).
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Every /api route runs behind authenticate; new domain routers mount here.
  const api = Router();
  api.use(authenticate);
  api.use('/me', meRouter);
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

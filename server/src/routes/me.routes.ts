import { Router } from 'express';
import { getMe } from '../controllers/me.controller.js';
import { requireUser } from '../middlewares/requireUser.js';

export const meRouter = Router();

// Mounted at /api/me behind the app-wide authenticate guard; requireUser makes
// the authenticated-user requirement explicit here and narrows the type.
meRouter.get('/', requireUser(getMe));

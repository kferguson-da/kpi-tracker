import type { AuthedRequestHandler } from '../middlewares/requireUser.js';

// Returns the authenticated caller's identity. Mounted behind `requireUser`,
// which guarantees and type-narrows req.user.
export const getMe: AuthedRequestHandler = (req, res) => {
  res.json({ email: req.user.email, role: req.user.role });
};

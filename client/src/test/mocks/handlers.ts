import { http, HttpResponse } from 'msw';

// Centralized request handlers for client tests. Add a default handler per
// endpoint here; individual tests override with server.use(...) when they need
// a specific response (see App.test.tsx).
export const handlers = [
  http.get('/api/me', () =>
    HttpResponse.json({ email: 'viewer@dealershipaccelerator.io', role: 'viewer' }),
  ),
];

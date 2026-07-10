import { http, HttpResponse } from 'msw';
import type { Me } from '../../lib/types';

const defaultMe: Me = {
  email: 'kevin@dealershipaccelerator.io',
  name: 'Kevin Ferguson',
  isAdmin: true,
};

export const handlers = [
  http.get('/api/me', () => HttpResponse.json(defaultMe)),
  http.get('/api/kpis', () => HttpResponse.json([])),
];

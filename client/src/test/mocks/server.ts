import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// One MSW server for all client tests, started/reset/closed by src/test/setup.ts.
export const server = setupServer(...handlers);

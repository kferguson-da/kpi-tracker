// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.) and
// wires up the centralized MSW server for every client test.
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Fail on any request that lacks a handler, so tests never hit the real network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

import { defineConfig } from 'vitest/config';

// Unit tests are pure and fast: no database, no network. They must run in
// milliseconds (see universal-testing.md §1.4).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/unit/**/*.unit.tests.ts'],
  },
});

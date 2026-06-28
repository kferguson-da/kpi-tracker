import { defineConfig } from 'vitest/config';

// API tests run against an isolated test database, serially (fileParallelism off)
// so per-file truncation can't stomp another file's data. NODE_ENV=test also stops
// env.ts from loading a dev .env. DATABASE_URL is honored from the environment
// (CI sets it) and otherwise falls back to the local test database.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/api/**/*.api.tests.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://kpi:kpi@localhost:5432/kpi_tracker_test?schema=public',
    },
  },
});

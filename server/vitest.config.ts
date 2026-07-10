import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    // API tests share a fake Prisma and must not interleave; unit tests are pure.
    // Kept single-threaded for determinism until the real test DB harness lands (Phase 3).
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
  },
});

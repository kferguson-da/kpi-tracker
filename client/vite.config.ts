import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Local dev: the API runs on :3000 and supplies identity via DEV_LOGIN_EMAIL
  // (Cloudflare Access does this in production).
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    // Unit/component tests only. Playwright e2e (tests/e2e-tests/*.spec.ts) runs separately.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});

import { defineConfig, devices } from '@playwright/test';

// e2e runs the real stack against an isolated database, with identity supplied
// the same way local dev does (DEV_LOGIN_EMAIL; Cloudflare Access in prod).
const E2E_DB_URL = 'postgresql://kpi:kpi@localhost:5432/kpi_tracker_e2e?schema=public';
const E2E_USER = 'e2e@dealershipaccelerator.io';

export default defineConfig({
  testDir: './tests/e2e-tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: 'list',
  globalSetup: './tests/e2e-tests/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm --prefix ../server run start:e2e',
      url: 'http://localhost:3000/healthz',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: E2E_DB_URL,
        DEV_LOGIN_EMAIL: E2E_USER,
        SEED_ADMIN_EMAIL: E2E_USER,
        NODE_ENV: 'development',
        PORT: '3000',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});

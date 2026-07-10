import { test, expect } from '@playwright/test';

// Slice 1 money path: a signed-in user sees the KPIs they can access on the
// dashboard. Seeds through the real API (proxied), then loads the app.
test('should_show_a_seeded_kpi_on_the_dashboard', async ({ page, request }) => {
  const created = await request.post('/api/kpis', {
    data: {
      name: 'Lead Response Rate',
      unit: 'PERCENT',
      comparator: 'GTE',
      goal: 90,
      cadence: 'MONTHLY',
    },
  });
  expect(created.status()).toBe(201);

  await page.goto('/');

  // Signed in (user chip) and the KPI is on the dashboard.
  await expect(page.getByText('e2e@dealershipaccelerator.io')).toBeVisible();
  await expect(page.getByText('Lead Response Rate')).toBeVisible();
  await expect(page.getByText('Goal ≥ 90%')).toBeVisible();
});

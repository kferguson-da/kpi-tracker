import { test, expect } from '@playwright/test';

// Slice 2b: edit a KPI from the dashboard and see the change reflected.
test('should_edit_a_kpi_from_the_dashboard', async ({ page, request }) => {
  await request.post('/api/kpis', {
    data: { name: 'Edit Target', unit: 'PERCENT', comparator: 'GTE', goal: 50, cadence: 'MONTHLY' },
  });

  await page.goto('/');
  const card = page.locator('.kpi-card', { hasText: 'Edit Target' });
  await card.getByRole('button', { name: 'Edit' }).click();

  await page.getByLabel('Goal value').fill('70');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(card.getByText('Goal ≥ 70%')).toBeVisible();
});

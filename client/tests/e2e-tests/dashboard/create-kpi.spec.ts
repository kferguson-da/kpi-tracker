import { test, expect } from '@playwright/test';

// Slice 2: create a KPI through the dashboard UI and see it appear.
test('should_create_a_kpi_from_the_dashboard', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'New KPI' }).click();
  await page.getByLabel('Name').fill('Show Rate');
  await page.getByLabel('Goal value').fill('65');
  await page.getByRole('button', { name: 'Save KPI' }).click();

  await expect(page.getByText('Show Rate')).toBeVisible();
  await expect(page.getByText('Goal ≥ 65%')).toBeVisible();
  await expect(page.getByText('Owner · e2e')).toBeVisible();
});

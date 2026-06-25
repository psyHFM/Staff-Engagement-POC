import { test, expect } from '@playwright/test';

test('Dashboard should be accessible', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('admin@staff.eng');
  await page.locator('input[name="password"]').fill('staffeng');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/.*dashboard/);
  await expect(page).toHaveURL(/.*dashboard/);
});

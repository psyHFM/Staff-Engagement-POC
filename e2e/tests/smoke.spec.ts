import { expect, test } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Smoke', () => {
  test('authenticated user sees the dashboard shell', async ({ page }) => {
    // Given + When
    await login(page);

    // Then
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('header.shell__bar')).toContainText('Staff Engagement');
    await expect(page.getByRole('link', { name: 'Skills' })).toBeVisible();
  });
});

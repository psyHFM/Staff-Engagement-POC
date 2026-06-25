import { expect, test } from '@playwright/test';

import { adminCredentials, login } from '../fixtures/auth';

/**
 * ATSE1-25 — auth-token persistence carve-out.
 *
 * Verifies that the JWT issued at login survives a full page reload so the
 * user is not bounced back to /login. The token is stored under
 * `staff-engagement.auth.jwt` in localStorage (see auth-storage.ts and
 * frontend-state.yaml -> persistence.carve_outs).
 */
test.describe('Auth session persistence (ATSE1-25)', () => {
  test('login survives a full page reload', async ({ page }) => {
    // Given — a fresh, logged-in session
    await login(page, adminCredentials);
    await expect(page).toHaveURL(/\/dashboard/);

    // Sanity check — the token IS persisted under the documented key
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('staff-engagement.auth.jwt')
    );
    expect(stored).toBeTruthy();

    // When — the user reloads the page (simulates a tab refresh / direct nav)
    await page.reload();

    // Then — they land on /dashboard, not /login
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('header.shell__bar')).toContainText('Staff Engagement');
  });

  test('storage is cleared on logout', async ({ page }) => {
    // Given — a logged-in session
    await login(page, adminCredentials);

    // When — the user logs out
    await page.getByRole('button', { name: /sign out|log out/i }).click();

    // Then — the persisted token is removed
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('staff-engagement.auth.jwt')
    );
    expect(stored).toBeNull();
    await expect(page).toHaveURL(/\/login/);
  });
});

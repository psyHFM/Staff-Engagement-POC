import { expect, test } from '@playwright/test';
import { adminCredentials, apiLogin, login } from '../fixtures/auth';
import { seedSkill } from '../fixtures/skills';

test.describe('Skills search page', () => {
  test.beforeAll(async () => {
    const { token, ctx } = await apiLogin(adminCredentials);
    await seedSkill(ctx, token, { employeeId: 1, skill: 'Angular', years: 6, projectCount: 4 });
    await ctx.dispose();
  });

  test('authenticated user can search for a skill and see ranked results', async ({ page }) => {
    // Given
    await login(page);

    // When
    await page.getByRole('link', { name: 'Skills' }).click();
    await page.getByLabel('Skill search').fill('Angular');

    // Then
    await expect(page.locator('.results-summary')).toContainText('Angular');
    const card = page.locator('.skill-card').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Admin User');
    await expect(card).toContainText('6');
    await expect(card).toContainText('4');
  });
});

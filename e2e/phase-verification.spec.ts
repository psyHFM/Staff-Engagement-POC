import { test, expect } from '@playwright/test';

test('Phase 1-5 Feature Accessibility Flow', async ({ page }) => {
  // 1. Authentication
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('admin@staff.eng');
  await page.locator('input[name="password"]').fill('staffeng');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/.*dashboard/);

  // 2. Phase 1: Employees
  await page.goto('/employees');
  const employeeHeading = page.getByText(/Employee/i);
  const employeeVisible = await employeeHeading.isVisible().catch(() => false);
  console.log('Phase 1 (Employee) accessible:', employeeVisible);

  // 3. Phase 2: Interactions
  await page.goto('/interactions');
  const interactionHeading = page.getByText(/Interactions/i);
  const interactionVisible = await interactionHeading.isVisible().catch(() => false);
  console.log('Phase 2 (Interaction) accessible:', interactionVisible);

  // 4. Phase 3: Tasks
  await page.goto('/tasks');
  const taskHeading = page.getByText(/My Tasks/i);
  const taskVisible = await taskHeading.isVisible().catch(() => false);
  console.log('Phase 3 (Task) accessible:', taskVisible);

  // 5. Phase 4: Portfolio
  await page.goto('/portfolio');
  const portfolioHeading = page.getByText(/Portfolio/i);
  const portfolioVisible = await portfolioHeading.isVisible().catch(() => false);
  console.log('Phase 4 (Portfolio) accessible:', portfolioVisible);

  // 6. Phase 5: Skills
  await page.goto('/skills');
  const skillsHeading = page.getByText(/Skills/i);
  const skillsVisible = await skillsHeading.isVisible().catch(() => false);
  console.log('Phase 5 (Skills) accessible:', skillsVisible);

  // Summary report for the user
  console.log('--- Final Accessibility Report ---');
  console.log(`Phase 1: ${employeeVisible}`);
  console.log(`Phase 2: ${interactionVisible}`);
  console.log(`Phase 3: ${taskVisible}`);
  console.log(`Phase 4: ${portfolioVisible}`);
  console.log(`Phase 5: ${skillsVisible}`);
});

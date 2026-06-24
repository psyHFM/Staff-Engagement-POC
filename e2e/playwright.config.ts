import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Staff Engagement POC.
 *
 * Constitution: e2e is a thin smoke / vertical-slice acceptance layer that runs
 * against the Docker Compose stack (http://localhost:4200 frontend,
 * http://localhost:8080 backend). It does not replace unit tests.
 *
 * Pre-requisite: `docker compose up -d --build` must be running.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});

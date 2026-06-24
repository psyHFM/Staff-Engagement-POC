import { APIRequestContext, Page, request } from '@playwright/test';

export interface Credentials {
  readonly username: string;
  readonly password: string;
}

export const adminCredentials: Credentials = {
  username: 'admin@staff.eng',
  password: 'staffeng'
};

/**
 * Log in through the UI. Assumes the page is on the SPA (any route) and the
 * auth guard will redirect to /login first.
 */
export async function login(page: Page, credentials: Credentials = adminCredentials): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Username').fill(credentials.username);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

/**
 * Obtain a JWT directly from the backend API for seeding data.
 */
export async function apiLogin(
  credentials: Credentials = adminCredentials
): Promise<{ token: string; ctx: APIRequestContext }> {
  const ctx = await request.newContext({
    baseURL: 'http://localhost:8080'
  });

  const res = await ctx.post('/api/v1/auth/login', { data: credentials });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }

  const body = await res.json();
  return { token: body.token as string, ctx };
}

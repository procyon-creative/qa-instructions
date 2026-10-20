import { test, expect } from '@playwright/test';

// The derived-steps sign-in test (examples/derived-steps/tests/sign-in.spec.ts)
// against the fixture site: three pages, each with its own marker color at
// (400, 140): the home page blue, Sign in orange, Login failed red. Recorded
// with trace-on.config.ts as traces/v9-on.zip (Playwright 1.63) and
// traces/v10-on.zip (1.64).

test('Sign in with bad credentials', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Fixture App' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveTitle('Sign in');
  await expect(page.getByLabel('Username')).toBeEmpty();

  await page.getByLabel('Username').fill('demo-user');
  await page.getByRole('button', { name: 'Submit bad credentials' }).click();
  await expect(page).toHaveURL(/login-error/);
  await expect(page.getByText('Invalid credentials')).toBeVisible();
});

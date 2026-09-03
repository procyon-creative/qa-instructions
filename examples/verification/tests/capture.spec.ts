import { test, expect } from '@qa-instructions/playwright';

test('Login error flow', async ({ qa, page }) => {
  qa.guide({
    title: 'Login error flow',
    prerequisite: 'Fixture app running at http://127.0.0.1:4321',
  });

  await qa.step(
    'Open the fixture app home page',
    'Blue STEP 1 HOME marker is visible',
    async () => {
      await page.goto('/');
      await expect(page.getByTestId('step-marker')).toHaveText('STEP 1 HOME');
    },
  );

  await qa.step(
    'Click Sign in',
    'Orange STEP 2 LOGIN marker and credential form are visible',
    async () => {
      await page.getByTestId('sign-in-link').click();
      await expect(page.getByTestId('step-marker')).toHaveText('STEP 2 LOGIN');
      await expect(page.getByTestId('username')).toBeVisible();
    },
  );

  await qa.step(
    'Submit bad credentials',
    'Red error banner and STEP 3 ERROR marker are visible',
    async () => {
      await page.getByTestId('submit-bad-credentials').click();
      await expect(page).toHaveURL(/login-error/);
      await expect(page.getByTestId('error-banner')).toHaveText(
        'Invalid credentials',
      );
      await expect(page.getByTestId('step-marker')).toHaveText('STEP 3 ERROR');
    },
  );
});

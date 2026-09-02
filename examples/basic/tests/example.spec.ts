import { test, expect } from '@qa-instructions/playwright';

test('Browse Playwright docs', async ({ qa, page }) => {
  qa.guide({
    title: 'Browse Playwright docs',
    prerequisite: 'None.',
  });

  await qa.step(
    'Open https://playwright.dev',
    'Homepage loads with Get started link visible',
    async () => {
      await page.goto('https://playwright.dev');
      await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
    },
  );

  await qa.step(
    'Click `Get started`',
    'Lands on intro docs page',
    async () => {
      await page.getByRole('link', { name: 'Get started' }).click();
      await expect(page).toHaveURL(/.*intro/);
    },
  );
});

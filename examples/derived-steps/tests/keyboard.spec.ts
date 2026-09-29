import { test, expect } from '@playwright/test';

// An ordinary Playwright test of a key press whose effect a tester can see:
// Tab moves focus from one field of the sign-in form to the next.

test('Move from Username to Password with Tab', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').click();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
});

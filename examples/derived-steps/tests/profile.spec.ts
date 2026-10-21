import { expect, test, type Locator } from '@playwright/test';

// Check-only groups: `test.step` blocks that only check the page and make
// no browser action of their own. Each becomes its own Section with one
// "Look at the …" step, whose Expected Result is the group's checks —
// including the filtered-locator count, the messaged and unmessaged value
// checks, and the soft checks.

/** The vertical position of the first element of a role in a card. */
const topOf = (
  card: Locator,
  role: Parameters<Locator['getByRole']>[0],
): Promise<number> =>
  card
    .getByRole(role)
    .first()
    .evaluate((el) => el.getBoundingClientRect().top);

test('Review the account profile', async ({ page }) => {
  await page.goto('/profile');

  await test.step('Profile card', async () => {
    const card = page.locator('.card', {
      has: page.getByRole('heading', { name: 'Profile' }),
    });
    await expect(card).toContainText('user@example.com');
    await expect(card.getByRole('term')).toHaveText(['Name:', 'Email:']);
    await expect(card.getByRole('definition')).toHaveCount(2);
    await expect(
      card.getByRole('definition').filter({ hasText: 'user@example.com' }),
    ).toHaveCount(1);
    expect
      .soft(
        await topOf(card, 'definition'),
        'Value 1 sits level with its label',
      )
      .toBeCloseTo(await topOf(card, 'term'), 0);
    expect
      .soft(await card.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBe(0);
  });

  await test.step('Details card', async () => {
    const card = page.locator('.card', {
      has: page.getByRole('heading', { name: 'Details' }),
    });
    await expect(card).toContainText('US West');
    await expect(card.getByRole('term')).toHaveText(['Plan:', 'Region:']);
    await expect(card.getByRole('definition')).toHaveCount(2);
    await expect(
      card.getByRole('definition').filter({ hasText: 'US West' }),
    ).toHaveCount(1);
    expect
      .soft(
        await topOf(card, 'definition'),
        'Value 1 sits level with its label',
      )
      .toBeCloseTo(await topOf(card, 'term'), 0);
    expect
      .soft(await card.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBe(0);
  });
});

/** Verify the real browser OTP access journey. */
import { expect, test } from '@playwright/test';

test('logs in with the demo OTP without browser errors', async ({ page }): Promise<void> => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('+15550000001');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await expect(page).toHaveURL(/\/verify$/);
  await page.getByLabel('Verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(browserErrors).toEqual([]);
});

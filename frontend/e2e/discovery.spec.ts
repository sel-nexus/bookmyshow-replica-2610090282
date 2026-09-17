/** Verify the eventual live catalogue discovery journey without browser errors. */
import { expect, test } from '@playwright/test';

test('discovers a movie, explicitly selects a theatre, and chooses the fixed seats', async ({ page }): Promise<void> => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('+15550000001');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await page.getByLabel('Verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your next screening.' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await expect(page).toHaveURL(/\/movies\/mov_paradise\/theatres$/);
  await expect(page.getByRole('button', { name: 'Continue to seats' })).toBeDisabled();
  await page.getByRole('button', { name: 'Grand Cinema' }).click();
  await page.getByRole('button', { name: 'Continue to seats' }).click();
  await expect(page.getByText('Selected theatre: Grand Cinema')).toBeVisible();
  await expect(page.getByRole('gridcell')).toHaveCount(3);
  await page.getByRole('button', { name: 'Select seats' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  expect(browserErrors).toEqual([]);
});

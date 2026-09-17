import { expect, test } from '@playwright/test';

test('completes a live booking journey and renders backend confirmation', async ({ page }) => {
  const failures: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/login');
  await page.getByLabel(/mobile/i).fill('+15550009999');
  await page.getByRole('button', { name: /send/i }).click();
  await page.waitForURL(/\/verify/);
  await page.getByLabel('Verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await page.getByRole('button', { name: /choose paradise/i }).click();
  await page.getByRole('button', { name: /grand cinema/i }).click();
  await page.getByRole('button', { name: /continue to seats/i }).click();
  await page.getByRole('button', { name: /select seats/i }).click();
  await page.getByRole('button', { name: /pay ₹450/i }).click();
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Processing Payment...');
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Grand Cinema')).toBeVisible();
  expect(failures).toEqual([]);
});

/** Verify real and negative browser OTP access journeys. */
import { expect, test, type Page } from '@playwright/test';

/** Capture client failures before a test begins navigation. */
function captureBrowserErrors(page: Page): string[] {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    const expectedHttpFailure = /^Failed to load resource: the server responded with a status of (401|503)/.test(message.text());
    if (message.type() === 'error' && !expectedHttpFailure) browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  return browserErrors;
}

test('logs in through real auth responses without browser errors', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/login');

  const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST');
  await page.getByLabel('Mobile number').fill('+15550000001');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/verify$/);

  const verifyResponse = page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST');
  const moviesResponse = page.waitForResponse((response) => response.url().includes('/api/movies') && response.request().method() === 'GET');
  await page.getByLabel('Verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  expect((await verifyResponse).status()).toBe(200);
  expect((await moviesResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(browserErrors).toEqual([]);
});

test('shows an empty-login alert without leaving the public login route', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await expect(page.getByText('Enter your mobile number.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Your next screening starts here.' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('shows a visible invalid-OTP error without protected navigation', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/login');
  const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST');
  await page.getByLabel('Mobile number').fill('+15550000002');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/verify$/);

  const invalidOtpResponse = page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST');
  await page.getByLabel('Verification code').fill('0000');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  expect((await invalidOtpResponse).status()).toBeGreaterThanOrEqual(400);
  await expect(page.getByText('The OTP is invalid.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/verify$/);
  await expect(page.getByRole('heading', { name: 'Choose your next screening.' })).not.toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('redirects an unauthenticated dashboard deep link to login without protected controls', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: /choose/i })).not.toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('redirects an unauthenticated theatre deep link to login without protected controls', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/movies/mov_paradise/theatres');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Continue to seats' })).not.toBeVisible();
  expect(browserErrors).toEqual([]);
});

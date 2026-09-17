/** Verify live booking confirmation and controlled booking failure behavior. */
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

/** Complete the real flow through the fixed checkout page. */
async function openCheckout(page: Page, mobileNumber: string): Promise<void> {
  await page.goto('/login');
  const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST');
  await page.getByLabel('Mobile number').fill(mobileNumber);
  await page.getByRole('button', { name: 'Send verification code' }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/verify$/);

  const verifyResponse = page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST');
  const moviesResponse = page.waitForResponse((response) => response.url().includes('/api/movies') && response.request().method() === 'GET');
  await page.getByLabel('Verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  expect((await verifyResponse).status()).toBe(200);
  expect((await moviesResponse).status()).toBe(200);

  const theatresResponse = page.waitForResponse((response) => response.url().includes('/api/theatres?movieId=mov_paradise') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  expect((await theatresResponse).status()).toBe(200);
  await page.getByRole('button', { name: 'Grand Cinema' }).click();
  await page.getByRole('button', { name: 'Continue to seats' }).click();
  await page.getByRole('button', { name: 'Select seats' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
}

test('completes a real UPI booking, renders backend confirmation, and safely loses ephemeral context on reload', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await openCheckout(page, '+15550009999');
  await page.getByLabel('UPI').check();
  await expect(page.getByLabel('UPI ID')).toBeVisible();
  await expect(page.getByText('Example: user@upi')).toBeVisible();

  const bookingResponse = page.waitForResponse((response) => response.url().includes('/api/bookings') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Pay ₹450' }).click();
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Processing Payment...');
  const response = await bookingResponse;
  expect(response.status()).toBe(201);
  const booking = await response.json() as { data: { confirmationId: string; paymentMethod: string; movie: { title: string }; theatre: { name: string } } };
  expect(booking.data.confirmationId).toMatch(/.+/);
  expect(booking.data.paymentMethod).toBe('UPI');
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible();
  await expect(page.getByText(booking.data.confirmationId)).toBeVisible();
  await expect(page.getByText(booking.data.movie.title)).toBeVisible();
  await expect(page.getByText(booking.data.theatre.name)).toBeVisible();
  await expect(page.getByText('UPI', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/confirmed-upi-booking.png', fullPage: true });

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).not.toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('shows a booking failure alert and does not render a confirmation for a controlled error response', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.route('**/api/bookings', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Booking service is temporarily unavailable.' } })
    });
  });
  await openCheckout(page, '+15550009998');
  await page.getByRole('button', { name: 'Pay ₹450' }).click();
  await expect(page.getByText('Booking service is temporarily unavailable.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).not.toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
  expect(browserErrors).toEqual([]);
});

/** Verify real and controlled catalogue discovery states without browser errors. */
import { expect, test, type Page } from '@playwright/test';

/** Capture client failures before a test begins navigation. */
function captureBrowserErrors(page: Page): string[] {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  return browserErrors;
}

/** Complete the real login flow and wait for its live movie response. */
async function loginToDashboard(page: Page, mobileNumber: string): Promise<void> {
  await page.goto('/login');
  const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST');
  await page.getByLabel('Mobile number').fill(mobileNumber);
  await page.getByRole('button', { name: 'Send verification code' }).click();
  expect((await loginResponse).status()).toBe(200);
  const verifyResponse = page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST');
  await page.getByLabel('Verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  expect((await verifyResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('discovers real catalogue data, explicitly selects a theatre, and chooses fixed seats', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/login');
  const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST');
  await page.getByLabel('Mobile number').fill('+15550000011');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  expect((await loginResponse).status()).toBe(200);
  const verifyResponse = page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST');
  const moviesResponse = page.waitForResponse((response) => response.url().includes('/api/movies') && response.request().method() === 'GET');
  await page.getByLabel('Verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  expect((await verifyResponse).status()).toBe(200);
  const movies = await moviesResponse;
  expect(movies.status()).toBe(200);
  expect((await movies.json()).data.movies).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'mov_paradise', title: 'Paradise' })]));
  await expect(page.getByRole('heading', { name: 'Choose your next screening.' })).toBeVisible();

  const theatresResponse = page.waitForResponse((response) => response.url().includes('/api/theatres?movieId=mov_paradise') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await expect(page).toHaveURL(/\/movies\/mov_paradise\/theatres$/);
  const theatres = await theatresResponse;
  expect(theatres.status()).toBe(200);
  expect((await theatres.json()).data.theatres).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'theatre_grand', name: 'Grand Cinema' })]));
  await expect(page.getByRole('button', { name: 'Continue to seats' })).toBeDisabled();
  await page.getByRole('button', { name: 'Grand Cinema' }).click();
  await page.getByRole('button', { name: 'Continue to seats' }).click();
  await expect(page.getByText('Selected theatre: Grand Cinema')).toBeVisible();
  await expect(page.getByRole('gridcell')).toHaveCount(3);
  await page.getByRole('button', { name: 'Select seats' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  expect(browserErrors).toEqual([]);
});

test('renders an accessible deterministic empty movie state with a controlled frontend response', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.route('**/api/movies', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { movies: [] } }) });
  });
  await loginToDashboard(page, '+15550000012');
  await expect(page.getByRole('status')).toHaveText('No screenings are available right now.');
  await expect(page.getByRole('button', { name: /choose/i })).not.toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('shows dashboard and theatre loading indicators while controlled responses are delayed', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.route('**/api/movies', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { movies: [{ id: 'mov_paradise', title: 'Paradise' }] } }) });
  });
  await loginToDashboard(page, '+15550000013');
  await expect(page.getByRole('status')).toHaveText('Loading movies…');
  await page.route('**/api/theatres?movieId=mov_paradise', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { theatres: [{ id: 'theatre_grand', name: 'Grand Cinema' }] } }) });
  });
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await expect(page.getByRole('status')).toHaveText('Loading theatres…');
  await expect(page.getByRole('button', { name: 'Grand Cinema' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('keeps discovery usable in a representative mobile viewport', async ({ page }): Promise<void> => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginToDashboard(page, '+15550000014');
  await expect(page.getByRole('heading', { name: 'Choose your next screening.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Paradise' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

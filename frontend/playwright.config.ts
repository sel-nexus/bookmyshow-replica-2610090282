import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000', headless: true },
  webServer: [
    {
      command: 'npm run build && node dist/index.js',
      cwd: '../backend',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: true,
      env: { DATABASE_PATH: './e2e.sqlite', JWT_SECRET: 'e2e-secret', JWT_ISSUER: 'demo-otp-access', JWT_AUDIENCE: 'demo-otp-access-web', PORT: '4000', CORS_ORIGIN: 'http://127.0.0.1:3000' }
    },
    {
      command: 'node node_modules/next/dist/bin/next dev',
      cwd: '.',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: true,
      env: { BACKEND_API_ORIGIN: 'http://127.0.0.1:4000' }
    }
  ]
});

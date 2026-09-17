/** Configure component tests without collecting Playwright specifications. */
import { defineConfig } from 'vitest/config';

/** Export the frontend Vitest configuration. */
export default defineConfig({
  esbuild: {
    jsx: 'automatic'
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx'],
    setupFiles: []
  }
});

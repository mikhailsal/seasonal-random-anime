import { defineConfig } from '@playwright/test';

const BASE_URL = 'http://localhost:4173/seasonal-random-anime/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure'
  },
  webServer: {
    // Build first so e2e always exercises the production bundle (not the dev server).
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI
  }
});

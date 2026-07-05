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
    command: 'npx vite --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI
  }
});

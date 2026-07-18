import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'narrow',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev --hostname 127.0.0.1 --port 3100',
    env: {
      ...process.env,
      AUTH_DEV_MODE: 'true',
      BETTER_AUTH_SECRET: 'cuweave-playwright-secret-at-least-32-characters',
      BETTER_AUTH_URL: 'http://127.0.0.1:3100',
    },
    url: 'http://127.0.0.1:3100/api/v1/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

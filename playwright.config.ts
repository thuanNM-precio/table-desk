import { defineConfig, devices } from '@playwright/test'

// Tests run against the production bundle served under the GitHub Pages sub-path
// (`npm test` makes it with BASE_PATH=/table-desk/), so the base path, router basename
// and mock service worker URL are all exercised exactly as they will be deployed.
const PORT = 5341
const baseURL = `http://localhost:${PORT}/table-desk/`

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort --base /table-desk/`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'e2e',
      testDir: './e2e',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'shots',
      testDir: './shots',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

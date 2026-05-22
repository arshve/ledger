import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    actionTimeout: 10000,
  },
  webServer: {
    command: 'cd /data/.openclaw/workspace/repos/ledger && npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30000,
  },
})

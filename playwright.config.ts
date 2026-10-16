import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: process.env.BILISOFA_ISOLATION_UI ? './tests/isolation-ui' : process.env.BILISOFA_NATIVE_UI ? './tests/native-ui' : './tests/ui',
  workers: 1,
  reporter: 'list',
  outputDir: '.local/playwright-results',
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1920, height: 1080 }, browserName: 'chromium' },
  webServer: { command: 'node tools/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});

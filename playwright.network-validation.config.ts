import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/network-validation-ui', workers: 1, reporter: 'list',
  outputDir: '.local/playwright-network-validation',
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1920, height: 1080 }, browserName: 'chromium' },
  webServer: { command: 'BILISOFA_PROBE_ROOT=dist/probe-network node tools/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});

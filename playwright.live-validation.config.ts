import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/network-validation-ui', testMatch: 'live.spec.ts', workers: 1, reporter: 'list',
  outputDir: '.local/playwright-live-validation',
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1920, height: 1080 }, browserName: 'chromium' },
  webServer: { command: 'node tools/serve.mjs', env: { BILISOFA_PROBE_ROOT: process.env.BILISOFA_LIVE_UI_ROOT ?? 'dist/probe-network' }, url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});

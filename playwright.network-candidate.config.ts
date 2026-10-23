import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/network-candidate-ui', workers: 1, reporter: 'list',
  outputDir: '.local/playwright-network-candidate',
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' },
  webServer: {
    command: 'BILISOFA_PROBE_ROOT=build/network-candidate/selftest node tools/serve.mjs',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false,
  },
});

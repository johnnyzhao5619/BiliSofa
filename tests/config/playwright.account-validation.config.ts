import { fromRoot, projectRoot } from './paths.ts';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: fromRoot('./tests/network-validation-ui'), testMatch: ['account.spec.ts', 'account-native-import.spec.ts', 'progress.spec.ts', 'account-reconcile.spec.ts', 'account-readback.spec.ts'], workers: 1, reporter: 'list',
  outputDir: fromRoot('.local/playwright-account-validation'),
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1920, height: 1080 }, browserName: 'chromium' },
  webServer: { cwd: projectRoot, command: 'BILISOFA_PROBE_ROOT=dist/probe-network node tools/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});

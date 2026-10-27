import { fromRoot, projectRoot } from './paths.ts';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: fromRoot('./tests/network-candidate-ui'), workers: 1, reporter: 'list',
  outputDir: fromRoot('.local/playwright-network-candidate'),
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' },
  webServer: { cwd: projectRoot,
    command: 'BILISOFA_PROBE_ROOT=build/network-candidate/selftest node tools/serve.mjs',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false,
  },
});

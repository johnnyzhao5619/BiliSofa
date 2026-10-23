import { defineConfig } from '@playwright/test';
process.env.BILISOFA_TEST_ROOT = 'dist/w06-app';
const legacy = process.env.BILISOFA_W06_LEGACY === '1';
export default defineConfig({ testIgnore: legacy ? [] : ['**/interactions.spec.ts'], testDir: legacy ? './tests/w04-media-ui' : './tests/w05-product-ui', workers: 1, reporter: 'list', outputDir: legacy ? '.local/playwright-w06-legacy' : '.local/playwright-w06-retained', timeout: 25000, use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1920, height: 1080 }, browserName: 'chromium' }, webServer: { command: 'node tools/serve.mjs', env: { BILISOFA_PROBE_ROOT: 'dist/w06-app', PORT: '4173' }, url: 'http://127.0.0.1:4173', reuseExistingServer: false } });

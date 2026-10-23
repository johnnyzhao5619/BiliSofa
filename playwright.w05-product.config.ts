import { defineConfig } from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/w05-app';
process.env.BILISOFA_TEST_ROOT=root;
const legacy = process.env.BILISOFA_W05_LEGACY === '1';
export default defineConfig({ testDir: legacy ? './tests/w04-media-ui' : './tests/w05-product-ui', workers: 1, reporter: 'list', outputDir: legacy ? '.local/playwright-w05-legacy' : '.local/playwright-w05-product', timeout: 25000, use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1920, height: 1080 }, browserName: 'chromium' }, webServer: { command: 'node tools/serve.mjs', env: { BILISOFA_PROBE_ROOT:root, PORT: '4173' }, url: 'http://127.0.0.1:4173', reuseExistingServer: false } });

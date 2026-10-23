import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/w05-overlay-ui', workers: 1, reporter: 'list', outputDir: '.local/playwright-w05-overlays', timeout: 15000, use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } });

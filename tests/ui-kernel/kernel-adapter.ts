import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
const adapter = readFileSync('tests/ui-kernel/kernel-adapter-worker.js', 'utf8');
/** ADR-108: serves the test adapter in place of both resident kernels; register before the app loads.
 * The lane Workers it forwards to are bundled by playwright.app.config.ts and served beside the build. */
export const routeKernelAdapter = async (page: Page): Promise<void> => {
  for (const name of ['public-kernel-worker.js', 'account-read-kernel-worker.js']) await page.route('**/' + name, route => route.fulfill({ contentType: 'text/javascript', body: adapter }));
};

import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
const adapter = readFileSync('tests/ui-kernel/kernel-adapter-worker.js', 'utf8');
/** ADR-108: serves the test adapter in place of the resident public kernel; register before the app loads. */
export const routeKernelAdapter = (page: Page) => page.route('**/public-kernel-worker.js', route => route.fulfill({ contentType: 'text/javascript', body: adapter }));

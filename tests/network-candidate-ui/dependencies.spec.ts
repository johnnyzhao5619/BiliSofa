import { test, expect } from '@playwright/test';

for (const missingCrypto of [false, true]) {
  test(`W01 linked candidate ${missingCrypto ? 'fails closed without Web Crypto' : 'reports actual library versions and uses Worker CSPRNG'}`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto('/');
    const results = await page.evaluate(async missing => {
      return await new Promise<string[]>((resolve, reject) => {
        const worker = new Worker(`selftest-worker.js${missing ? '?no-crypto=1' : ''}`);
        const received: string[] = [];
        const timer = setTimeout(() => { worker.terminate(); reject(new Error('candidate_timeout')); }, 10000);
        worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error('candidate_worker_error')); };
        worker.onmessage = event => {
          received.push(event.data);
          if (event.data === 'DEPS:selftest_complete_no_network' || event.data === 'DEPS:abort_no_success' || event.data === 'DEPS:unexpected_output') {
            clearTimeout(timer); worker.terminate(); resolve(received);
          }
        };
      });
    }, missingCrypto);
    if (missingCrypto) {
      expect(results).toContain('DEPS:abort_no_success');
      expect(results).not.toContain('DEPS:crypto_random_pass');
      expect(results).not.toContain('DEPS:selftest_complete_no_network');
    } else {
      expect(results).toEqual(['DEPS:versions_protocols_pass', 'DEPS:crypto_random_pass',
        'DEPS:scoped_options_pass', 'DEPS:selftest_complete_no_network']);
    }
    expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
  });
}

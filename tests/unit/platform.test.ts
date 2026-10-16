import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticAddress, inspectPlatform } from '../../apps/tv/src/platform/samsung.ts';
test('W01 private display-only address accepts WiFi ON, rejects disconnected/bad addresses and is absent from diagnostics', async () => {
  const target = globalThis as unknown as { tizen?: unknown };
  const previous = target.tizen;
  try {
    target.tizen = { systeminfo: { getPropertyValue: (name: string, success: (value: unknown) => void) => success({ status: name === 'WIFI_NETWORK' ? 'ON' : 'DISCONNECTED', ipAddress: '192.0.2.1' }) } };
    assert.equal(await diagnosticAddress(), '192.0.2.1');
    assert.equal(JSON.stringify(inspectPlatform()).includes('192.0.2.1'), false);
    for (const ipAddress of ['999.1.1.1', '127.0.0.1', '0.0.0.0', '224.0.0.1', '192.0.2.1/path']) {
      target.tizen = { systeminfo: { getPropertyValue: (_name: string, success: (value: unknown) => void) => success({ status: 'ON', ipAddress }) } };
      assert.equal(await diagnosticAddress(), undefined);
    }
  } finally { if (previous === undefined) delete target.tizen; else target.tizen = previous; }
});

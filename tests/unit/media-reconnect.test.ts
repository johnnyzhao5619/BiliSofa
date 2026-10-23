import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconnectPlan } from '../../apps/tv/src/app/reconnect-policy.ts';
// ADR-100: only closed network/timeout failures reconnect, at most twice in two minutes, resuming 2 s early.
test('ADR-100 reconnect plan is bounded, backs off and never resurrects an unconfirmed close', () => {
  assert.deepEqual(reconnectPlan('network', true, 0, -Infinity, 1000, 65000), { attempt: 1, delayMs: 1500, resumeMs: 63000 });
  assert.deepEqual(reconnectPlan('timeout', true, 1, 1000, 5000, 1000), { attempt: 2, delayMs: 3000, resumeMs: 0 });
  assert.equal(reconnectPlan('network', true, 2, 1000, 5000, 0), undefined);
  assert.deepEqual(reconnectPlan('network', true, 2, 1000, 1000 + 120001, 0)?.attempt, 1);
  for (const reason of ['permission', 'login', 'unsupported', 'invalid', undefined]) assert.equal(reconnectPlan(reason, true, 0, -Infinity, 0, 0), undefined);
  assert.equal(reconnectPlan('network', false, 0, -Infinity, 0, 0), undefined);
});

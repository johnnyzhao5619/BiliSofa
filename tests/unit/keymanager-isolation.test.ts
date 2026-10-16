import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probeForeignSyntheticRead } from '../../apps/tv/src/platform/keymanager-isolation-probe.ts';
import { probeApplicationIdentity } from '../../apps/tv/src/platform/samsung.ts';
test('W01 observer reads exactly the fixed owned synthetic fixture, never exports returned bytes', () => {
  let calls = 0;
  const result = probeForeignSyntheticRead({ getData(alias) { calls++; assert.deepEqual(alias, { name: 'bilisofa.w01.persistence.v1', packageId: 'BiliProbe1' }); return 'synthetic-result-must-stay-private'; } });
  assert.equal(calls, 1); assert.equal(result.verdict, 'FAIL'); assert.ok(!JSON.stringify(result).includes('synthetic-result-must-stay-private'));
});
test('W01 observer missing/denied is unverified until owner presence is proved; other errors never masquerade as isolation', () => {
  for (const name of ['NotFoundError', 'SecurityError', 'UnknownError', 'TypeMismatchError', 'VerificationError']) {
    const result = probeForeignSyntheticRead({ getData() { throw { name, message: 'not-exported' }; } });
    assert.equal(result.verdict, ['NotFoundError', 'SecurityError'].includes(name) ? 'UNVERIFIED' : 'FAIL'); assert.ok(!JSON.stringify(result).includes('not-exported'));
  }
  assert.equal(probeForeignSyntheticRead(undefined).verdict, 'BLOCKED');
});
test('W01 runtime identity checks only the calling app and distinguishes owner and observer', () => {
  const globals = globalThis as unknown as { tizen?: unknown }, prior = globals.tizen;
  try {
    for (const [id, owner, observer] of [['BiliProbe1.Probe', true, false], ['BiliIsola1.Probe', false, true], ['unrelated', false, false]] as const) {
      globals.tizen = { application: { getCurrentApplication: () => ({ appInfo: { id } }) } };
      assert.equal(probeApplicationIdentity('owner'), owner); assert.equal(probeApplicationIdentity('observer'), observer);
    }
    globals.tizen = undefined; assert.equal(probeApplicationIdentity('observer'), false);
  } finally { globals.tizen = prior; }
});

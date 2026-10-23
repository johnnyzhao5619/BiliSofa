import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePgcFollowStatusBody } from '../../packages/bili-client/src/pgc-follow.ts';
import { parsePgcFollowValue } from '../../packages/contracts/src/pgc-follow-dto.ts';
// 0.49.1 (ADR-096): the per-user status is the follow state; a rejected write keeps B站's code.
test('Q3 fix: the per-user status reads follow, treats logged-out as login loss and errors as failures', () => {
  assert.equal(parsePgcFollowStatusBody(JSON.stringify({ code: 0, result: { login: 1, follow: 1 } })), 'yes');
  assert.equal(parsePgcFollowStatusBody(JSON.stringify({ code: 0, result: { login: 1, follow: 0 } })), 'no');
  assert.equal(parsePgcFollowStatusBody(JSON.stringify({ code: 0, result: { login: 1 } })), 'unknown');
  assert.throws(() => parsePgcFollowStatusBody(JSON.stringify({ code: 0, result: { login: 0, follow: 0 } })), /login/);
  assert.throws(() => parsePgcFollowStatusBody(JSON.stringify({ code: -101 })), /login/);
  assert.throws(() => parsePgcFollowStatusBody(JSON.stringify({ code: -500 })), /network/);
});
test('Q3 fix: only a rejected write may carry an integer API code', () => {
  assert.deepEqual(parsePgcFollowValue({ kind: 'write', ack: 'rejected', apiCode: -111 }), { kind: 'write', ack: 'rejected', apiCode: -111 });
  assert.deepEqual(parsePgcFollowValue({ kind: 'write', ack: 'accepted' }), { kind: 'write', ack: 'accepted' });
  for (const bad of [{ kind: 'write', ack: 'accepted', apiCode: -111 }, { kind: 'write', ack: 'rejected', apiCode: 0 }, { kind: 'write', ack: 'rejected', apiCode: '-111' }, { kind: 'write', ack: 'rejected', apiCode: 1.5 }]) assert.throws(() => parsePgcFollowValue(bad));
});

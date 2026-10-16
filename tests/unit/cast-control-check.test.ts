import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCastControls } from '../../apps/tv/src/app/cast-control-check.ts';
import { DomainError, type PlayerState } from '../../packages/contracts/src/index.ts';
for (const mode of ['complete', 'third-fails', 'frozen', 'cancel'] as const) test(`W01 control characterization ${mode} is bounded and uses real timeline evidence`, async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let clock = 0, calls = 0, freeze = false; const stages: string[] = [], controller = new AbortController();
  const player = { state: 'playing' as PlayerState, timeMs: 12000, seeking: false };
  const ticker = setInterval(() => { if (!freeze && !player.seeking && player.state === 'playing') player.timeMs += 250; }, 250);
  const result = checkCastControls(player, async () => {
    calls++; if (mode === 'third-fails' && calls === 3) throw new DomainError('network');
    if (mode === 'cancel') { controller.abort(); throw new DomainError('cancelled'); }
    player.timeMs = 5000;
  }, controller.signal, code => { stages.push(code); if (mode === 'frozen' && code.endsWith('observe_35')) freeze = true; }, () => clock);
  const checked = mode === 'complete' ? result : assert.rejects(result, { code: mode === 'third-fails' ? 'network' : mode === 'frozen' ? 'timeout' : 'cancelled' });
  for (let i = 0; i < 220; i++) { clock += 250; t.mock.timers.tick(250); for (let k = 0; k < 8; k++) await Promise.resolve(); }
  await checked; clearInterval(ticker); assert.equal(calls, mode === 'cancel' ? 1 : 3);
  if (mode === 'complete') assert.ok(stages.includes('avplay.control_check_observe_35')); assert.ok(stages.every(v => /^avplay\.control_check_(wait_[1-3]|seek_[1-3]|target_[1-3]|observe_35)$/.test(v)));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RateObservation } from '../../packages/media/src/rate-observation.ts';
import { PLAYBACK_RATES, type PlaybackRate } from '../../packages/contracts/src/playback-rate.ts';
function observe(expected: PlaybackRate, actual: number): RateObservation {
  const window = new RateObservation(expected, 1000);
  for (let t = 1000; t <= 8000; t += 500) window.add(t, 30000 + (t - 1000) * actual);
  return window;
}
test('G4 actual 1x and 2x progression match independently of SDK setter', () => {
  for (const rate of [1, 2] as const) assert.equal(observe(rate, rate).result().matched, true);
});
test('G4 accepted setter with actual 1x cannot prove 2x; stall is not success', () => {
  assert.equal(observe(2, 1).result().matched, false); assert.equal(observe(1, 0).result().matched, false);
});
test('G4 short burst and skipped initial callbacks do not count as complete observation', () => {
  const w = new RateObservation(2, 0); w.add(0, 0); w.add(1000, 2000); w.add(2000, 4000); w.add(3000, 6000); assert.equal(w.result().ready, false);
});
test('G4 backward/discontinuous positions and non-monotonic clocks cannot prove rate', () => {
  for (const pair of [[3000, 2000], [2000, 5000], [3000, 1000000], [NaN, 6000], [3000, -1]]) {
    const w = new RateObservation(1, 0); w.add(2000, 5000); w.add(pair[0]!, pair[1]!); assert.equal(w.result().matched, false); assert.equal(w.result().ready, true);
  }
});
test('G4 large absolute media offset has no effect on rate calculation', () => {
  const w = new RateObservation(1, 0); for (let t = 2000; t <= 7000; t += 1000) w.add(t, 100000 + t); assert.equal(w.result().ratio100, 100);
});
test('R07 fractional speed must match actual clock slope; every adjacent product rate, 1x setter no-op and stall are distinguished', () => {
  for (const rate of PLAYBACK_RATES) {
    assert.equal(observe(rate, rate).result().matched, true);
    for (const actual of [0, ...PLAYBACK_RATES]) assert.equal(observe(rate, actual).result().matched, actual === rate, `expected ${rate}, actual ${actual}`);
  }
  assert.equal(observe(1.25, 1.18).result().matched, true); assert.equal(observe(1.25, 1.12).result().matched, false);
  assert.match(observe(.25, .25).result().code, /^rate\.x0_25_matched_r25$/);
});

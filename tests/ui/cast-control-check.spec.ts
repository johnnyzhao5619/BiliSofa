import { test, expect } from '@playwright/test';
// Real UI/Worker coordination with anonymous SDK shims; no media decoding proof.
for (const mode of ['complete', 'third-failure', 'back', 'home', 'initial-error', 'cleanup-unknown', 'late-network-issue', 'prepare-network-issue', 'connect-retry'] as const) test(`W01 automatic cast controls ${mode} preserves approval, cancellation and report ownership`, async ({ page }) => {
  const errors: string[] = []; let report: string | undefined;
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(mode => {
    let state = 'NONE', base = 12000, origin = performance.now(), seeks = 0; let ticker: ReturnType<typeof setInterval> | undefined;
    let listener: { oncurrentplaytime?(t: number): void };
    const calls: string[] = [];
    Object.assign(globalThis, {
      castTest: { calls },
      tizen: { systeminfo: { getPropertyValue(_name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } } },
      webapis: { avplay: {
        getState: () => state,
        open() { calls.push('open'); state = 'IDLE'; }, setListener(value: typeof listener) { listener = value; }, setDisplayRect() {},
        setBufferingParam() {}, setTimeoutForBuffering() {},
        setStreamingProperty() { throw Error('unexpected prebuffer'); },
        prepareAsync(ok: () => void, error: (e: unknown) => void) { if (mode === 'prepare-network-issue') return; if (mode === 'initial-error') { error({ name: 'InvalidAccessError', message: 'private-fixture-url' }); return; } state = 'READY'; ok(); },
        play() { calls.push('play'); state = 'PLAYING'; origin = performance.now(); listener.oncurrentplaytime?.(base); if (!ticker) ticker = setInterval(() => { if (state === 'PLAYING') listener.oncurrentplaytime?.(base + performance.now() - origin); }, 250); },
        pause() { state = 'PAUSED'; },
        seekTo(_ms: number, ok: () => void, error: (e: unknown) => void) {
          calls.push('seek'); seeks++;
          if ((mode === 'third-failure' || mode === 'late-network-issue') && seeks === 3) { state = 'IDLE'; error({ name: 'InvalidValuesError', message: 'private-fixture-url' }); return; }
          base = 5000; origin = performance.now(); listener.oncurrentplaytime?.(base); ok();
        },
        stop() { calls.push('stop'); state = 'IDLE'; }, close() { calls.push('close'); state = 'NONE'; },
        getTotalTrackInfo: () => [{ type: 'VIDEO' }, { type: 'AUDIO' }],
      }, appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver(_n: number, ok: () => void) { ok(); } } },
    });
  }, mode);
  await page.route('**/fixture-report', async route => { report = route.request().postData()!; await route.fulfill({ body: 'ok' }); });
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `var M=self.Module,alive=true,count=0;M._cast_rpc_enable=()=>{};M._cast_media_begin=()=>{if(++count!==1)throw Error('duplicate approval');${mode === 'connect-retry' ? "M.print('BRIDGE:retry:1');" : ''}M.print('BRIDGE:ready');M.print('BRIDGE:request:get_full');${mode === 'prepare-network-issue' ? "setTimeout(()=>{if(alive)M.print('BRIDGE:issue:206:28');},50);" : ''}return 1;};M.callMain=(args)=>{if(args[0]==='http'){M._probe_stop=()=>M.print('HTTP:stopped');fetch('/fixture-report',{method:'POST',body:args[1]});M.print('HTTP:ready');return;}M._cast_stop=()=>{alive=false;${mode === 'late-network-issue' ? "M.print('BRIDGE:flow:e:2:0:5:4:4');M.print('BRIDGE:issue:206:28');" : ''}M.print('BRIDGE:flow:s:0:0:5:4:4');M.print('BRIDGE:stopped');${mode === 'cleanup-unknown' ? '' : "setTimeout(()=>M.print('CAST:closed:0:0:0:0:0:0:0'),20);"}};M.print('CAST:ready');setTimeout(()=>{if(alive)M.print('CAST:source:pass');},100);};M.onRuntimeInitialized();` }));
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.goto('/'); if (mode === 'complete') await page.screenshot({ path: '/tmp/bilisofa-032-main.png' }); await page.locator('#cast-controls').click();
  await expect(page.locator('#cast-play')).toBeEnabled();
  await expect(page.locator('#cast-play')).toHaveText('播放并自动检查三次回跳');
  if (mode === 'complete') await page.screenshot({ path: '/tmp/bilisofa-032-auto-confirmation.png' });
  expect(await page.evaluate(() => (globalThis as unknown as { castTest: { calls: string[] } }).castTest.calls)).toEqual([]);
  await page.locator('#cast-play').click();
  if (mode !== 'initial-error' && mode !== 'prepare-network-issue') await expect(page.locator('#results')).toContainText('avplay.control_check_seek_1');
  if (mode === 'back') await page.keyboard.press('Escape');
  if (mode === 'home') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  if (mode === 'back' || mode === 'home') {
    await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
    await page.clock.runFor(80000); await page.waitForTimeout(200);
    expect(report).toBeUndefined(); await expect(page.locator('#media-dialog')).toBeHidden();
    if (mode === 'home') { await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await expect(page.locator('#inspect')).toBeFocused(); }
    else await expect(page.locator('#cast-controls')).toBeFocused();
  } else {
    for (let i = 0; i < 80; i++) {
      const results = await page.locator('#results').textContent();
      if (mode === 'initial-error' || mode === 'prepare-network-issue' || results?.includes(mode === 'complete' || mode === 'connect-retry' || mode === 'cleanup-unknown' ? 'avplay.control_check_complete_timeline_only' : 'avplay.control_check_failed_')) break;
      await page.clock.runFor(1000);
    }
    if (mode === 'cleanup-unknown') {
      await page.clock.runFor(5100); await expect(page.locator('#results')).toContainText('cast.cleanup_unknown_restart_required'); expect(report).toBeUndefined(); expect(errors).toEqual([]); return;
    }
    // Native closure uses the real Worker clock; do not advance the main cleanup deadline.
    await expect.poll(() => report).toBeTruthy();
    await expect(page.locator('#cast-controls')).toBeFocused();
    const data = JSON.parse(report!);
    expect(report).not.toMatch(/10\.0\.0\.9|cast\.mp4|private-fixture-url/);
    expect(data.entries.some((e: { code: string }) => e.code === 'cast.native_closed_confirmed')).toBe(true);
    expect(data.entries.some((e: { code: string }) => e.code === (mode === 'late-network-issue' ? 'cast.media_flow_e_c2_p0_w5_m4_l4' : 'cast.media_flow_s_c0_p0_w5_m4_l4'))).toBe(true);
    if (mode === 'late-network-issue') expect(data.entries.some((e: { code: string; verdict: string }) => e.code === 'cast.media_issue_206_28' && e.verdict === 'FAIL')).toBe(true);
    if (mode === 'complete' || mode === 'connect-retry') {
      if (mode === 'connect-retry') expect(data.entries.some((e: { code: string }) => e.code === 'cast.media_retry_1')).toBe(true);
      expect(data.entries.find((e: { code: string }) => e.code === 'avplay.control_check_complete_timeline_only')?.verdict).toBe('UNVERIFIED');
      expect(data.entries.some((e: { code: string }) => e.code === 'avplay.seek_history_v1_sss')).toBe(true);
    } else if (mode === 'third-failure' || mode === 'late-network-issue') {
      expect(data.entries.some((e: { code: string }) => e.code === 'avplay.seek_callback_invalidvalueserror_b0_t0_si')).toBe(true);
      expect(data.entries.some((e: { code: string }) => e.code === 'avplay.seek_history_v1_ssf')).toBe(true);
    } else expect(data.entries.some((e: { code: string }) => e.code === (mode === 'prepare-network-issue' ? 'cast.media_issue_206_28' : 'cast.avplay_prepare_invalidaccesserror_si'))).toBe(true);
  }
  const calls = await page.evaluate(() => (globalThis as unknown as { castTest: { calls: string[] } }).castTest.calls);
  expect(calls.filter(v => v === 'open')).toHaveLength(1);
  if (mode === 'complete' || mode === 'connect-retry' || mode === 'third-failure' || mode === 'late-network-issue') expect(calls.filter(v => v === 'seek')).toHaveLength(3);
  expect(errors).toEqual([]);
});

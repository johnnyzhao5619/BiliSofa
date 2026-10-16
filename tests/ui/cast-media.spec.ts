import { test, expect } from '@playwright/test';
// Anonymous native/AVPlay shims exercise the actual packaged Worker and UI.
// They do not decode media or provide TV evidence.
for (const mode of ['back', 'home', 'end', 'late-prepare', 'bridge-failure', 'upstream-failure', 'expired', 'confirmation-timeout', 'prepare-error', 'play-error', 'pending-seek', 'seek-retry', 'seek-slow', 'seek-timeout', 'seek-home', 'native-repeat', 'native-invalid-values', 'native-api-present', 'native-home'] as const) test(`W01/F20 TV-approved candidate ${mode} keeps one player and closes its native lease`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript((mode) => {
    let state = 'NONE', listener: { oncurrentplaytime?(t: number): void; onstreamcompleted?(): void };
    const calls: string[] = [], settings: unknown[] = [], offsets: string[] = []; let seeks = 0;
    const api = {
      getState: () => state,
      open(url: string) { if (!/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/cast\.mp4$/.test(url)) throw Error('unowned source'); calls.push('open'); state = 'IDLE'; },
      setListener(value: typeof listener) { listener = value; }, setDisplayRect() {},
      prepareAsync(ok: () => void, error: (value: unknown) => void) { if (mode === 'prepare-error') { error({ name: 'InvalidAccessError', message: 'private-fixture-url' }); return; } setTimeout(() => { state = 'READY'; ok(); }, mode === 'late-prepare' ? 400 : 0); },
      play() { if (mode === 'play-error') throw Error('private-fixture-url'); calls.push('play'); state = 'PLAYING'; listener.oncurrentplaytime?.(12000); },
      pause() { calls.push('pause'); state = 'PAUSED'; },
      setBufferingParam(...args: unknown[]) { if (state !== 'IDLE') throw Error('buffer state'); settings.push(args); },
      setTimeoutForBuffering(n: number) { if (state !== 'IDLE') throw Error('buffer state'); settings.push(n); },
      seekTo(_ms: number, ok: () => void, error: (value: unknown) => void) {
        calls.push('seek'); if (mode === 'native-invalid-values') { state = 'IDLE'; error({ name: 'InvalidValuesError', message: 'private-fixture-url' }); return; } if (mode === 'seek-retry' && ++seeks === 1) { error({ name: 'InvalidAccessError', message: 'private-fixture-url' }); return; }
        setTimeout(() => { listener.oncurrentplaytime?.(5000); ok(); }, mode === 'seek-timeout' ? 60000 : mode === 'seek-slow' ? 20000 : mode === 'pending-seek' || mode === 'seek-home' || mode === 'native-home' ? 700 : 0);
      },
      stop() { calls.push('stop'); state = 'IDLE'; }, close() { calls.push('close'); state = 'NONE'; },
      getTotalTrackInfo: () => [{ type: 'VIDEO' }, { type: 'AUDIO' }],
    };
    if (mode.startsWith('native-')) Object.assign(api, { setStreamingProperty(_key: string, value: string) { offsets.push(value); throw Error('unexpected prebuffer'); } });
    Object.assign(globalThis, { castTest: { calls, settings, offsets, time: (ms: number) => listener.oncurrentplaytime?.(ms), end: () => listener.onstreamcompleted?.() },
      tizen: { systeminfo: { getPropertyValue(name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: name === 'WIFI_NETWORK' ? 'ON' : 'CONNECTED' }); } } },
      webapis: { avplay: api, appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver(_n: number, ok: () => void) { ok(); } } },
    });
  }, mode);
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M._cast_rpc_enable=()=>{};var count=0,alive=true;M._cast_media_begin=()=>{if(++count!==1||!alive)throw Error('duplicate approval');${mode === 'confirmation-timeout' ? 'return 1;' : mode === 'bridge-failure' ? "M.print('CAST:media:failed');return -1;" : "M.print('BRIDGE:ready');M.print('BRIDGE:request:get_full');M.print('BRIDGE:request:head');setTimeout(()=>{if(alive)M.print('BRIDGE:served:1');},100);return 1;"}};M.callMain=()=>{M._cast_stop=()=>{alive=false;M.print('BRIDGE:stopped');setTimeout(()=>M.print('CAST:closed:0:0:0:0:0:0:0'),20);};M.print('CAST:ready');setTimeout(()=>{if(alive)M.print('CAST:source:pass');},100);setTimeout(()=>{if(alive)M.print('CAST:seen:6');},180);${mode === 'upstream-failure' ? "setTimeout(()=>{if(alive)M.print('BRIDGE:issue:403:22');},400);" : ''}${mode === 'expired' ? "setTimeout(()=>{if(alive)M.print('CAST:media:expired');},400);" : ''}};M.onRuntimeInitialized();` }));
  await page.goto('/'); await expect(page).toHaveTitle('BiliSofa · W01 探针'); await page.locator('#cast').click();
  await expect(page.locator('#cast-close')).toBeFocused(); await expect(page.locator('#cast-play')).toBeEnabled();
  await expect(page.locator('#cast-state')).toContainText('按左选择');
  await page.waitForTimeout(120); await expect(page.locator('#cast-state')).toContainText('按左选择');
  expect(await page.evaluate(() => (globalThis as unknown as { castTest: { calls: string[] } }).castTest.calls)).toEqual([]);
  if (mode === 'expired') {
    await expect(page.locator('#cast-play')).toBeDisabled(); await expect(page.locator('#cast-history')).toContainText('cast.media_expired');
    await page.keyboard.press('Escape');
  } else {
    if (mode === 'confirmation-timeout') await page.clock.install();
    if (mode === 'back') await page.screenshot({ path: '/tmp/bilisofa-cast-028-confirmation.png' });
    await page.keyboard.press('ArrowLeft'); await expect(page.locator('#cast-play')).toBeFocused(); await page.keyboard.press('Enter');
    await expect(page.locator('#results')).toContainText('cast.candidate_confirm_sent');
    await expect(page.locator('#results')).toContainText('cast.media_approved');
    if (mode === 'confirmation-timeout') { await page.clock.fastForward(10100); await expect(page.locator('#results')).toContainText('cast.candidate_confirm_timeout'); }
    else if (mode === 'prepare-error' || mode === 'play-error') { await expect(page.locator('#results')).toContainText(mode === 'play-error' ? 'cast.avplay_play_failed' : 'cast.avplay_prepare_invalidaccesserror'); }
    else if (mode === 'bridge-failure') { await expect(page.locator('#cast-history')).toContainText('cast.media_failed'); await expect(page.locator('#media-dialog')).toBeHidden(); await page.keyboard.press('Escape'); }
    else {
      await expect(page.locator('#media-dialog')).toBeVisible(); await expect(page.locator('#cast-dialog')).toBeHidden();
      await expect(page.locator('#media-toggle')).toBeFocused();
      if (mode === 'late-prepare') { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
      else {
        await expect(page.locator('#results')).toContainText('cast.avplay_started_visual_audio_check_required');
        await expect(page.locator('#results')).toContainText('avplay.tracks_video1_audio1');
        expect(await page.evaluate(() => (globalThis as unknown as { castTest: { settings: unknown[] } }).castTest.settings)).toEqual([['PLAYER_BUFFER_FOR_PLAY', 'PLAYER_BUFFER_SIZE_IN_SECOND', 4], ['PLAYER_BUFFER_FOR_RESUME', 'PLAYER_BUFFER_SIZE_IN_SECOND', 4], 10]);
        if (mode.startsWith('native-')) {
          await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
          if (mode === 'native-invalid-values') await expect(page.locator('#results')).toContainText('avplay.seek_callback_invalidvalueserror_b0_t0_si');
          else if (mode === 'native-home') {
            await expect(page.locator('#media-status')).toContainText('跳转中');
            await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(800);
          } else {
            await expect(page.locator('#media-status')).toContainText('playing · 5.0');
            if (mode === 'native-repeat') {
              await page.evaluate(() => (globalThis as unknown as { castTest: { time(ms: number): void } }).castTest.time(12000));
              await expect(page.locator('#media-status')).toContainText('12.0'); await page.keyboard.press('Enter'); await expect(page.locator('#media-status')).toContainText('playing · 5.0');
            }
            await page.keyboard.press('Escape');
          }
        } else if (mode === 'upstream-failure') { await page.waitForTimeout(150); } else if (mode === 'back') {
          await page.keyboard.press('Enter'); await expect(page.locator('#media-status')).toContainText('paused'); await page.keyboard.press('Enter');
          await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); await expect(page.locator('#media-status')).toContainText('5.0');
          await page.screenshot({ path: '/tmp/bilisofa-cast-028-desktop.png' }); await page.keyboard.press('Escape');
        } else if (mode === 'pending-seek') {
          await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
          await expect(page.locator('#media-status')).toContainText('跳转中');
          await page.keyboard.press('Enter'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter');
          expect(await page.evaluate(() => (globalThis as unknown as { castTest: { calls: string[] } }).castTest.calls)).toEqual(['open', 'play', 'seek']);
          await expect(page.locator('#media-status')).toContainText('playing · 5.0');
          await page.keyboard.press('Enter'); await expect(page.locator('#media-status')).toContainText('paused');
          await page.keyboard.press('Enter'); await expect(page.locator('#media-status')).toContainText('playing');
          await page.keyboard.press('Escape');
        } else if (mode === 'seek-retry') {
          await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
          await expect(page.locator('#media-feedback')).toContainText('可重试'); await expect(page.locator('#media-feedback')).toContainText('avplay.seek_callback_invalidaccesserror_b0_t0');
          await expect(page.locator('#media-dialog')).toBeVisible(); await expect(page.locator('#media-seek')).toBeFocused();
          await page.screenshot({ path: '/tmp/bilisofa-cast-030-seek-retry.png' });
          await page.keyboard.press('Enter'); await expect(page.locator('#media-status')).toContainText('playing · 5.0');
          await expect(page.locator('#media-feedback')).toContainText('跳转已响应'); await page.keyboard.press('Escape');
        } else if (mode === 'seek-slow' || mode === 'seek-timeout') {
          await page.clock.install(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
          await page.clock.fastForward(20000); await expect(page.locator('#media-dialog')).toBeVisible();
          if (mode === 'seek-slow') { await expect(page.locator('#media-status')).toContainText('playing · 5.0'); await page.keyboard.press('Escape'); }
          else { await expect(page.locator('#media-status')).toContainText('跳转中'); await page.clock.fastForward(10100); await expect(page.locator('#results')).toContainText('avplay.seek_timeout_b0_t0'); await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed'); await page.clock.fastForward(31000); }
        } else if (mode === 'seek-home') {
          await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); await expect(page.locator('#media-status')).toContainText('跳转中');
          await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
          await page.waitForTimeout(800);
        } else if (mode === 'end') await page.evaluate(() => (globalThis as unknown as { castTest: { end(): void } }).castTest.end());
        else await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
      }
    }
  }
  if (mode === 'upstream-failure') await expect(page.locator('#results')).toContainText('cast.media_issue_403_22');
  await expect(page.locator('#media-dialog')).toBeHidden(); await expect(page.locator('#cast-dialog')).toBeHidden();
  await expect(page.locator('main')).not.toHaveAttribute('inert', ''); await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
  if (mode === 'home' || mode === 'seek-home' || mode === 'native-home') { await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await expect(page.locator('#inspect')).toBeFocused(); }
  else await expect(page.locator('#cast')).toBeFocused();
  const calls = await page.evaluate(() => (globalThis as unknown as { castTest: { calls: string[] } }).castTest.calls);
  if (mode === 'late-prepare' || mode === 'bridge-failure' || mode === 'expired' || mode === 'confirmation-timeout' || mode === 'prepare-error' || mode === 'play-error') expect(calls.filter(v => v === 'play')).toEqual([]);
  else { expect(calls.filter(v => v === 'open')).toHaveLength(1); if (mode !== 'native-invalid-values') expect(calls).toContain('stop'); expect(calls.at(-1)).toBe('close'); }
  await page.locator('#export').click(); await expect(page.locator('#export-output')).not.toHaveValue(/10\.0\.0\.9|\/cast\.mp4|deadline=|discovery-uuid|private-fixture-url/);
  if (mode === 'prepare-error' || mode === 'play-error') await expect(page.locator('#export-output')).toHaveValue(/cast\.media_requests_v1_11/);
  if (mode === 'seek-retry') await expect(page.locator('#export-output')).toHaveValue(/avplay\.seek_callback_success_b0_t1/);
  if (mode.startsWith('native-')) { expect(calls).toContain('seek'); expect(await page.evaluate(() => (globalThis as unknown as { castTest: { offsets: string[] } }).castTest.offsets)).toEqual([]); }
  if (mode === 'native-repeat') await expect(page.locator('#export-output')).toHaveValue(/avplay\.seek_history_v1_ss/);
  expect(errors).toEqual([]);
});

import { test, expect } from '@playwright/test';
for (const mode of ['good', 'ignored', 'unsupported', 'stalled-2x', 'home', 'late-prepare', 'close-unknown'] as const) test(`G4 rate real Worker / mock SDK ${mode}`, async ({ page }) => {
  const reports: string[] = [], errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); await page.clock.install();
  await page.addInitScript(mode => {
    let state = 'NONE', speed = 1, time = 0, listener: { oncurrentplaytime?: (ms: number) => void } = {}, timer: ReturnType<typeof setInterval> | undefined;
    const calls: string[] = []; Object.assign(globalThis, { fixtureCalls: calls,
      tizen: { systeminfo: { getPropertyValue(_key: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } } },
      webapis: { appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver(_v: number, ok: () => void) { ok(); } }, avplay: {
        getState: () => state, open() { state = 'IDLE'; calls.push('open'); }, setListener(v: typeof listener) { listener = v; }, setDisplayRect() {},
        prepareAsync(ok: () => void) { setTimeout(() => { state = 'READY'; ok(); }, mode === 'late-prepare' ? 1000 : 5); },
        play() { calls.push('play'); state = 'PLAYING'; timer = setInterval(() => { time += mode === 'stalled-2x' && speed === 2 ? 0 : 500 * speed; listener.oncurrentplaytime?.(time); }, 500); },
        pause() { state = 'PAUSED'; }, seekTo() {},
        setSpeed(rate: number) { calls.push('rate:' + rate); if (mode === 'unsupported') throw { name: 'NotSupportedError' }; if (mode !== 'ignored') speed = rate; },
        getCurrentStreamInfo() { return [{ type: 'VIDEO', extra_info: '{"Width":640,"Height":360,"Bit_rate":500000,"fourCC":"AVC1"}' }]; },
        stop() { calls.push('stop'); state = 'IDLE'; clearInterval(timer); },
        close() { calls.push('close'); if (mode !== 'close-unknown') state = 'NONE'; clearInterval(timer); },
      } } });
  }, mode);
  await page.route('**/fixture-report', async r => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module,status=200,ranged=0;var cdn='https://fixture.bilivideo.com/synthetic.m4s?deadline='+Math.floor(Date.now()/1000+3600)+'&sign=private-synthetic';
var t=v=>({id:v?16:30216,baseUrl:cdn,mimeType:v?'video/mp4':'audio/mp4',codecs:v?'avc1.64001E':'mp4a.40.2',bandwidth:v?500000:66000,width:640,height:360,SegmentBase:{Initialization:'0-914',indexRange:'915-6546'}});
M._guest_response_ptr=()=>0;M._guest_response_length=()=>M.HEAPU8.length;M._guest_http_status=()=>status;M._guest_curl_status=()=>0;M._guest_range_valid=()=>ranged;
M.callMain=a=>{if(a[0]==='http'){M._probe_stop=()=>M.print('HTTP:stopped');fetch('/fixture-report',{method:'POST',body:a[1]});M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),5);return;}
if(a[0]==='bridge'){M._bridge_stop=()=>M.print('BRIDGE:stopped');M.print('BRIDGE:ready');return;}
status=200;ranged=0;var data;
if(a[0]==='guest-view')data={bvid:'BV14GHy6bE9n',cid:123,title:'合成详情',owner:{name:'合成UP'},state:0,rights:{pay:0,ugc_pay:0,is_stein_gate:0},pages:[{cid:123,page:1,from:'vupload',duration:95}]};
else if(a[0]==='guest-playurl')data={quality:16,timelength:95000,dash:{duration:95,video:[t(true)],audio:[t(false)]}};
else if(a[0]==='guest-range'){status=206;ranged=1;}else throw Error('unexpected operation');
M.HEAPU8=new TextEncoder().encode(JSON.stringify({code:0,data}));M.print('GUEST:closed');};M.onRuntimeInitialized();` }));
  await page.goto('/'); await expect.poll(() => reports.join('')).toContain('rate.ready'); await page.locator('#run').click();
  if (mode === 'late-prepare') {
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls.join(','))).toBe('open');
    await page.keyboard.press('Escape'); await page.clock.runFor(1200);
    expect(await page.evaluate(() => (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls)).not.toContain('play');
  } else {
    await expect(page.locator('#media-status')).toContainText('当前 1 倍'); await expect(page.locator('#media-stop')).toBeFocused();
    if (mode === 'home') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    else await page.clock.runFor(24000);
  }
  if (mode !== 'home') {
    await expect.poll(() => reports.join('')).toContain(mode === 'close-unknown' ? 'rate.cleanup_unconfirmed_restart_required' : 'rate.closed_');
    await expect(page.locator('#run')).toBeFocused();
    if (mode === 'good' || mode === 'close-unknown') expect(reports.join('')).toContain('rate.sequence_observed_audio_unverified');
    if (mode === 'ignored' || mode === 'unsupported' || mode === 'stalled-2x') { expect(reports.join('')).toContain('rate.fallback_1x_observed'); expect(reports.join('')).not.toContain('rate.p1_x2_matched'); }
    if (mode === 'good') expect(reports.join('')).toContain('rate.p1_x2_matched_r200');
  }
  const calls = await page.evaluate(() => (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls);
  expect(calls).toContain('close');
  expect(reports.join('')).not.toMatch(/sign=|bilivideo|private-synthetic|10\.0\.0\.9/); expect(errors).toEqual([]);
});

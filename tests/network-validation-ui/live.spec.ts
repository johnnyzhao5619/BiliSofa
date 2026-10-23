import { test, expect } from '@playwright/test';
for (const mode of ['good', 'auto-observe', 'unsafe-manifest', 'unsafe-refresh', 'segment-http-fail', 'cancel-preflight', 'home-playing'] as const) test(`G4 public live fixture ${mode}`, async ({ page }) => {
  const reports: string[] = [], errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install();
  if (mode !== 'auto-observe') await page.route('http://127.0.0.1:4173/', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('<meta name="live-auto" content="once">','') }); });
  await page.route('http://127.0.0.1:40325/**', route => route.fulfill({ status: 200, body: '#EXTM3U\n' }));
  await page.addInitScript(() => {
    let state = 'NONE', listener: { oncurrentplaytime?: (ms: number) => void } = {}, timer: ReturnType<typeof setInterval> | undefined;
    Object.assign(globalThis, { fixtureCalls: [] as string[], tizen: { systeminfo: { getPropertyValue(_key: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } } }, webapis: { appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver(_v: number, ok: () => void) { ok(); } }, avplay: {
      getState: () => state,
      open() { (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls.push('open'); state = 'IDLE'; },
      setListener(v: typeof listener) { listener = v; }, setDisplayRect() {},
      prepareAsync(ok: () => void) { setTimeout(() => { state = 'READY'; ok(); }, 5); },
      play() { state = 'PLAYING'; let ms = 0; timer = setInterval(() => listener.oncurrentplaytime?.(ms += 1000), 100); }, pause() { state = 'PAUSED'; }, seekTo() {},
      getCurrentStreamInfo() { return [{ type: 'VIDEO', extra_info: '{"Width":1280,"Height":720,"Bit_rate":1500000,"fourCC":"H264"}' }]; },
      stop() { (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls.push('stop'); state = 'IDLE'; clearInterval(timer); }, close() { (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls.push('close'); state = 'NONE'; clearInterval(timer); },
    } } });
  });
  await page.route('**/fixture-report', async r => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M.callMain=a=>{fetch('/fixture-report',{method:'POST',body:a[1]});M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),5);};M.onRuntimeInitialized();` }));
  await page.route('**/live/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module,size=0,closed=false,inC=false,serving=false;M.HEAPU8=new Uint8Array(262144);M._live_input_ptr=()=>1024;M._live_body_ptr=()=>8192;M._live_body_length=()=>size;M._live_http_status=()=>200;M._live_curl_status=()=>0;
M._live_response_clear=()=>{if(inC)throw Error('C reentry');size=0;M.HEAPU8.fill(0,8192,139265);};
M._live_stop=()=>{if(inC)throw Error('C reentry');closed=true;M.print('LIVE:closed');};
M._live_relay_start=()=>{if(inC)throw Error('C reentry');serving=true;M.print('LIVE:relay_ready');setTimeout(()=>{if(!closed)M.print('LIVE:relay_manifest');},30);return 1;};
M._live_relay_segment=()=>1;
M._live_relay_connections=()=>serving?2:0;M._live_relay_requests=()=>serving?2:0;M._live_relay_rejections=()=>0;M._live_relay_flags=()=>serving?1:0;M._live_relay_status=()=>serving?200:0;
M._live_relay_reply=(length,kind)=>{if(inC)throw Error('C reentry');if(kind===1){var manifest=new TextDecoder().decode(M.HEAPU8.slice(8192,8192+length));if(/https|sign|bilivideo/.test(manifest)||!manifest.includes('s1.ts'))throw Error('remote dependency leaked');M.print('LIVE:served_manifest');setTimeout(()=>{if(!closed)M.print('LIVE:relay_segment');},5);}else M.print('LIVE:served_segment');return 1;};
M._live_begin=op=>{if(inC)throw Error('C reentry');setTimeout(()=>{if(closed)return;var value=op===0?JSON.stringify({code:0,data:{room_id:7734200,short_id:6,live_status:1,encrypted:false,is_locked:false,hidden_till:0,playurl_info:{playurl:{stream:[{protocol_name:'http_hls',format:[{format_name:'ts',codec:[{codec_name:'avc',base_url:'/live/a.m3u8',url_info:[{host:'https://live-fixture.bilivideo.com/',extra:'?sign=private-synthetic'}]}]}]}]}}}}):'#EXTM3U\\n#EXT-X-VERSION:3\\n#EXT-X-TARGETDURATION:6\\n#EXT-X-MEDIA-SEQUENCE:123\\n#EXTINF:6,\\n${mode === 'unsafe-manifest' ? 'https://outside.invalid/' : ''}a.ts\\n';
if(serving&&${mode === 'unsafe-refresh'})value+='#EXT-X-KEY:METHOD=AES-128,URI="https://outside.invalid/key"\\n';
var bytes=op===2?new Uint8Array(512):op===3?new Uint8Array(1128):new TextEncoder().encode(value);if(op===2||op===3){for(var i=0;i<bytes.length;i+=188)bytes[i]=0x47;}M._live_http_status=()=>op===2?206:op===3&&${mode === 'segment-http-fail'}?403:200;M.HEAPU8.set(bytes,8192);size=bytes.length;inC=true;M.print('LIVE:response:'+op);inC=false;},${mode === 'cancel-preflight' ? '500' : '5'});return 1;};
M.callMain=()=>{inC=true;M.print('LIVE:ready');inC=false;};M.onRuntimeInitialized();` }));
  await page.goto('/'); await expect.poll(() => reports.join('')).toContain('live.ready');
  if (mode !== 'auto-observe') await page.locator('#run').click();
  if (mode === 'good' || mode === 'home-playing' || mode === 'auto-observe') {
    await expect(page.locator('#media-status')).toContainText('live.playing_verify_picture_audio');
    await expect(page.locator('#media-stop')).toBeFocused();
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls.length)).toBe(1);
    if (mode === 'home-playing') {
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      await expect.poll(() => page.evaluate(() => (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls.join(','))).toBe('open,stop,close');
      expect(errors).toEqual([]); return;
    }
    if (mode === 'auto-observe') { await page.clock.runFor(31000); await expect.poll(() => reports.join('')).toContain('live.automatic_30sec_observation'); expect(reports.join('')).toMatch(/live\.exit_auto_wall_3[01]s/); }
    else { await page.clock.runFor(3200); await page.keyboard.press('Escape'); }
    await expect.poll(() => reports.join('')).toContain('avplay.stream_v1_w1280_h720_b1500000_vh264_aunknown');
    await expect(page.locator('#run')).toBeFocused();
  } else if (mode === 'cancel-preflight') {
    await expect(page.locator('#media-stop')).toBeVisible(); await page.keyboard.press('Escape'); await page.waitForTimeout(650);
  } else if (mode === 'unsafe-manifest') {
    await expect.poll(() => reports.join('')).toContain('live.failed_manifest_format_closed');
    await expect(page.locator('#status')).toContainText('FAIL · live.failed_manifest_format_closed');
    expect(reports.join('')).toContain('live.exit_error_before_play');
  } else {
    const issue = mode === 'unsafe-refresh' ? 'live.failed_manifest_format_closed' : 'live.failed_segment_h403_c0_closed';
    await expect.poll(() => reports.join('')).toContain(issue); await expect(page.locator('#status')).toContainText('FAIL · ' + issue);
    expect(reports.join('')).toMatch(/live\.exit_error_wall_[0-9]+s/);
  }
  await expect.poll(() => reports.join('')).toContain('live.stopped_closed');
  if (mode === 'good') expect(reports.join('')).toMatch(/live\.exit_back_wall_[0-9]+s/);
  expect(reports.join('')).not.toMatch(/private-synthetic|bilivideo|outside.invalid|10\.0\.0\.9/);
  if (mode === 'unsafe-manifest' || mode === 'cancel-preflight') expect(await page.evaluate(() => (globalThis as unknown as { fixtureCalls: string[] }).fixtureCalls.length)).toBe(0);
  if (mode === 'good' || mode === 'auto-observe') { expect(reports.join('')).toContain('live.relay_summary_m1_s1'); expect(reports.join('')).toContain('live.http_v1_a2_q2_r0_f1_h200'); }
  expect(errors).toEqual([]);
});

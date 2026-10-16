import { test, expect } from '@playwright/test';
// Runs the packaged Worker, SOAP parser and UI coordinator with anonymous C and
// AVPlay shims. No media decoder, TLS, Samsung runtime or official sender proof.
for (const mode of ['controls', 'foreign', 'back-seek', 'remote', 'home', 'paused-remote-seek', 'slow-start', 'slow-start-home'] as const) test(`W01/F20 approved phone receiver ${mode}`, async ({ page }) => {
  const errors: string[] = [], replies: { id: number; status: number; body: string }[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript((mode) => {
    let seekActive = false;
    let state = 'NONE', listener: { oncurrentplaytime?(ms: number): void } = {};
    const calls: string[] = [];
    Object.assign(globalThis, { receiverCalls: calls,
      tizen: { systeminfo: { getPropertyValue(_name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } } },
      webapis: { avplay: { getState: () => state, getDuration: () => { if (seekActive) { calls.push('duration-during-seek'); throw Error('SDK busy'); } return 240000; },
        open() { calls.push('open'); state = 'IDLE'; }, setListener(v: typeof listener) { listener = v; }, setDisplayRect() {},
        prepareAsync(ok: () => void) { setTimeout(() => { state = 'READY'; ok(); }, mode.startsWith('slow-start') ? 6000 : 10); },
        play() { calls.push('play'); state = 'PLAYING'; listener.oncurrentplaytime?.(12000); }, pause() { calls.push('pause'); state = 'PAUSED'; },
        seekTo(ms: number, ok: () => void) { calls.push('seek'); seekActive = true; setTimeout(() => { seekActive = false; listener.oncurrentplaytime?.(ms); ok(); }, 700); },
        stop() { calls.push('stop'); state = 'IDLE'; }, close() { calls.push('close'); state = 'NONE'; }, setBufferingParam() {}, setTimeoutForBuffering() {},
      }, appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver(_n: number, done: () => void) { done(); } } },
    });
  }, mode);
  await page.route('**/native/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/receiver-fixture-result', async r => { replies.push(r.request().postDataJSON()); await r.fulfill({ body: '{}' }); });
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module,alive=true,current,serial=0,queue=[],busy=false,mode=${JSON.stringify(mode)};
M.HEAPU8=new Uint8Array(16000);M._cast_rpc_enable=()=>{};M._cast_rpc_peer=id=>current&&current.id===id?current.peer:0;
M._cast_rpc_service=id=>current&&current.id===id?3:0;M._cast_rpc_body=()=>64;M._cast_rpc_body_size=()=>current.bytes.length;M._cast_rpc_action=()=>4500;M._cast_rpc_buffer=()=>5000;M._cast_source_buffer=()=>12000;
var uri='http://cdn.bilivideo.com/upgcxcode/fixture.mp4?deadline='+Math.floor(Date.now()/1000+3600)+'&sign=private-fixture-marker';
var esc=s=>s.replace(/&/g,'&amp;'),ns='urn:schemas-upnp-org:service:AVTransport:1';
function emit(action,extra='',peer=0x0a000009){if(action==='Play'&&!extra)extra='<Speed>1</Speed>';queue.push({action,extra,peer});pump();}
function pump(){if(!alive||busy||!queue.length)return;busy=true;var q=queue.shift();current={...q,id:++serial};var xml='<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:'+q.action+' xmlns:u="'+ns+'"><InstanceID>0</InstanceID>'+q.extra+'</u:'+q.action+'></s:Body></s:Envelope>';current.bytes=new TextEncoder().encode(xml);M.HEAPU8.fill(0);M.HEAPU8.set(current.bytes,64);M.HEAPU8.set(new TextEncoder().encode('"'+ns+'#'+q.action+'"'),4500);M.print('CAST:rpc:'+current.id);}
function offer(peer=0x0a000009,source=uri){emit('SetAVTransportURI','<CurrentURI>'+esc(source)+'</CurrentURI><CurrentURIMetaData></CurrentURIMetaData>',peer);}
M._cast_rpc_reply=(id,status,length)=>{if(!current||current.id!==id)return 0;var body=new TextDecoder().decode(M.HEAPU8.subarray(5000,5000+length));fetch('/receiver-fixture-result',{method:'POST',body:JSON.stringify({id,status,body})});current=undefined;busy=false;setTimeout(pump,20);return 1;};
M._cast_source_begin=()=>{setTimeout(()=>M.print('CAST:source:pass'),10);return 1;};
M._cast_media_begin=()=>{M.print('BRIDGE:ready');setTimeout(()=>{
 if(!alive)return;
 if(mode==='controls'){offer();emit('GetTransportInfo');emit('Pause');emit('GetTransportInfo');emit('Play');emit('Seek','<Unit>REL_TIME</Unit><Target>00:00:05</Target>');emit('GetTransportInfo');setTimeout(()=>{if(alive){emit('GetPositionInfo');emit('Stop');emit('GetTransportInfo');emit('Play');setTimeout(()=>alive&&emit('GetTransportInfo'),500);}},1100);}
 if(mode==='foreign'){offer(0x0a000008);emit('Pause','',0x0a000008);emit('GetMediaInfo','',0x0a000008);offer(0x0a000009,uri+'&new=1');emit('GetTransportInfo');}
 if(mode.startsWith('slow-start')){offer();emit('Play');setTimeout(()=>{if(alive){emit('GetTransportInfo');emit('Play');}},4000);setTimeout(()=>{if(alive){emit('GetTransportInfo');emit('Pause');}},6800);}
 if(mode==='paused-remote-seek'){emit('Pause');setTimeout(()=>alive&&M.print('BRIDGE:resume:1'),400);}
 if(mode==='back-seek'){emit('Seek','<Unit>REL_TIME</Unit><Target>00:00:05</Target>');}
 if(mode==='remote'){setTimeout(()=>{if(alive){emit('Pause');emit('GetTransportInfo');}},900);setTimeout(()=>alive&&emit('Pause'),2000);}
 },100);return 1;};
M.callMain=()=>{M._cast_stop=()=>{alive=false;M.print('BRIDGE:stopped');M.print('CAST:closed:0:0:0:0:0:0:0');};M.print('CAST:ready');setTimeout(()=>offer(),20);};M.onRuntimeInitialized();
` }));
  await page.goto('/'); await page.locator('#cast-receiver').click(); await expect(page.locator('#cast-play')).toBeEnabled();
  expect(replies[0]?.status).toBe(500); expect(replies[0]?.body).not.toContain('private-fixture-marker');
  await page.locator('#cast-play').click(); await expect(page.locator('#media-dialog')).toBeVisible();
  if (mode === 'controls') {
    await expect.poll(() => replies.length).toBe(13);
    expect(replies.slice(1).map(r => [r.id, r.status])).toEqual(Array.from({length:12}, (_,i) => [i+2,200]));
    expect(replies[2]?.body).toContain('PLAYING'); expect(replies[4]?.body).toContain('PAUSED_PLAYBACK'); expect(replies[7]?.body).toContain('TRANSITIONING');
    expect(replies[8]?.body).toContain('<RelTime>00:00:05</RelTime>'); expect(replies[8]?.body).toContain('<TrackDuration>00:04:00</TrackDuration>');
    expect(replies[10]?.body).toContain('STOPPED'); expect(replies[12]?.body).toContain('PLAYING');
    await expect(page.locator('#results')).toContainText('cast.receiver_seek_complete');
  } else if (mode === 'foreign') {
    await expect.poll(() => replies.length).toBe(6); expect(replies.slice(1,5).every(r => r.status === 500 && !r.body.includes('private-fixture-marker'))).toBe(true);
    expect(replies[5]?.body).toContain('PLAYING');
    expect(await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls)).toEqual(['open','play']);
  } else if (mode === 'back-seek') {
    await expect(page.locator('#media-status')).toContainText('跳转中'); await page.keyboard.press('Escape'); await page.waitForTimeout(850);
    await expect(page.locator('#media-dialog')).toBeHidden(); expect(await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls.filter(c=>c==='play').length)).toBe(1);
  } else if (mode.startsWith('slow-start')) {
    await expect(page.locator('#results')).toContainText('cast.receiver_snapshot_applied');
    await expect.poll(() => replies.length).toBeGreaterThanOrEqual(5);
    expect(replies[1]?.status).toBe(200); expect(replies[2]?.status).toBe(200); expect(replies[3]?.body).toContain('TRANSITIONING'); expect(replies[4]?.status).toBe(200);
    expect(await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls.filter(c => c === 'play').length)).toBe(0);
    if (mode === 'slow-start-home') {
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(2400); expect(await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls.filter(c => c === 'play').length)).toBe(0);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    } else {
      await expect.poll(() => replies.length).toBe(7); expect(replies[5]?.body).toContain('PLAYING'); expect(replies[6]?.status).toBe(200);
      await expect(page.locator('#media-status')).toContainText('paused');
      expect(await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls.filter(c => c === 'play').length)).toBe(1);
    }
  } else if (mode === 'paused-remote-seek') {
    await expect(page.locator('#media-status')).toContainText('paused'); await page.locator('#media-seek').click(); await expect(page.locator('#media-status')).toContainText('跳转中');
    await expect(page.locator('#media-status')).toContainText('paused · 5.0'); await expect(page.locator('#results')).toContainText('cast.media_resume_1'); await page.locator('#media-toggle').click(); await expect(page.locator('#media-status')).toContainText('playing');
    await page.locator('#media-phone').click(); await expect(page.locator('#media-feedback')).toContainText('已交还');
  } else if (mode === 'home') {
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect(page.locator('#media-dialog')).toBeHidden();
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  } else {
    await page.locator('#media-toggle').click(); await expect.poll(() => replies.length).toBe(3); expect(replies[1]?.status).toBe(500); expect(replies[1]?.body).toContain('705'); expect(replies[2]?.body).toContain('PAUSED_PLAYBACK');
    await page.locator('#media-phone').click(); await expect.poll(() => replies.length).toBe(4); expect(replies[3]?.status).toBe(200);
  }
  if (!['back-seek', 'home', 'slow-start-home'].includes(mode)) await page.keyboard.press('Escape');
  await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
  await expect(page.locator((mode === 'home' || mode === 'slow-start-home') ? '#inspect' : '#cast-receiver')).toBeFocused(); await expect(page.locator('#media-phone')).toBeHidden();
  await page.locator('#export').click(); await expect(page.locator('#export-output')).not.toContainText('private-fixture-marker');
  expect(await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls)).not.toContain('duration-during-seek');
  expect(errors).toEqual([]);
});

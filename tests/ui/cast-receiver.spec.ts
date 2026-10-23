import { decodeOfferTrace } from '../../packages/contracts/src/cast-offer-diagnostics.ts';
import { test, expect } from '@playwright/test';
// Runs the packaged Worker, SOAP parser and UI coordinator with anonymous C and
// AVPlay shims. No media decoder, TLS, Samsung runtime or official sender proof.
for (const mode of ['controls', 'foreign', 'back-seek', 'remote', 'home', 'paused-remote-seek', 'slow-start', 'slow-start-home', 'phone-seek-error', 'phone-seek-miss', 'handshake', 'handshake-source-fail', 'handshake-cancel', 'handshake-foreign', 'handshake-large-init', 'handshake-large-init-home', 'handshake-large-init-seek', 'handshake-large-init-seek-home', 'handshake-session', 'handshake-session-home', 'handshake-session-source-fail', 'handshake-session-unclosed', 'handshake-session-foreign', 'handshake-session-policy', 'handshake-session-prepare-hold', 'handshake-session-offer-cap', 'handshake-akam', 'handshake-session-akam', 'handshake-session-akam-denied', 'handshake-session-timeout', 'handshake-session-timeout-stall', 'handshake-session-timeout-home', 'handshake-session-timeout-later-stall', 'handshake-session-timeout-paused'] as const) test(`W01/F20 approved phone receiver ${mode}`, async ({ page }) => {
  const errors: string[] = [], replies: { id: number; status: number; body: string }[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript((mode) => {
    let seekActive = false, offset = 12000, time = 0; let ticker: ReturnType<typeof setInterval> | undefined;
    let state = 'NONE', listener: { oncurrentplaytime?(ms: number): void; onerror?(value: string): void } = {};
    const calls: string[] = [];
    Object.assign(globalThis, { receiverCalls: calls,
      tizen: { systeminfo: { getPropertyValue(_name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } } },
      webapis: { avplay: { getState: () => state, getDuration: () => { if (mode === 'paused-remote-seek' && offset === 5000 && state === 'IDLE') throw Error('duration forbidden in held IDLE'); if (seekActive) { calls.push('duration-during-seek'); throw Error('SDK busy'); } return mode.startsWith('handshake-session') ? Math.max(1, calls.filter(c => c === 'open').length) * 240000 : 240000; },
        open() { calls.push('open'); offset = 12000; state = 'IDLE'; }, setListener(v: typeof listener) { listener = v; }, setDisplayRect() {},
        ...(mode === 'controls' ? { getCurrentStreamInfo() { return [{type:'VIDEO',extra_info:'{"Width":"1920","Height":"1080","Bit_rate":"6000000","fourCC":"H264"}'},{type:'AUDIO',extra_info:'{"fourCC":"AACL"}'}]; } } : {}),
        ...((mode === 'paused-remote-seek' || mode === 'controls' || mode === 'phone-seek-error' || mode === 'phone-seek-miss' || mode.startsWith('handshake-large-init-seek')) ? { setStreamingProperty(_key: string, value: string) { calls.push('prebuffer'); offset = Number(value); } } : {}),
        prepareAsync(ok: () => void) { seekActive = true; if (mode === 'handshake-session-prepare-hold' && calls.filter(c => c === 'open').length > 1) return; setTimeout(() => { seekActive = false; if (mode === 'phone-seek-error' && offset === 5000) { listener.onerror?.('PLAYER_ERROR_CONNECTION_FAILED'); return; } state = (mode === 'paused-remote-seek' || mode === 'controls' || mode === 'phone-seek-error' || mode === 'phone-seek-miss') && offset !== 12000 ? 'IDLE' : 'READY'; ok(); }, mode.startsWith('handshake-large-init-seek') && offset !== 12000 ? 1200 : mode.startsWith('handshake-large-init') ? 2200 : mode.startsWith('slow-start') ? 6000 : (mode === 'paused-remote-seek' || mode === 'controls' || mode === 'phone-seek-error' || mode === 'phone-seek-miss') && offset !== 12000 ? 700 : 10); },
        play() { calls.push('play'); state = 'PLAYING'; time = mode === 'phone-seek-miss' && offset === 60000 ? 100 : offset; listener.oncurrentplaytime?.(time); if (mode === 'phone-seek-miss' || mode.startsWith('handshake-session-timeout') && mode!=='handshake-session-timeout-stall') ticker = setInterval(() => { if (state === 'PLAYING' && !(mode==='handshake-session-timeout-later-stall' && time>=15000)) { time += 200; listener.oncurrentplaytime?.(time); } }, 200); }, pause() { calls.push('pause'); state = 'PAUSED'; },
        seekTo(ms: number, ok: () => void) { calls.push('seek'); seekActive = true; setTimeout(() => { seekActive = false; listener.oncurrentplaytime?.(ms); ok(); }, 700); },
        stop() { calls.push('stop'); state = 'IDLE'; }, close() { calls.push('close'); if (mode === 'handshake-session-unclosed' && calls.includes('play')) { state = 'IDLE'; return; } state = 'NONE'; clearInterval(ticker); ticker = undefined; }, setBufferingParam() {}, setTimeoutForBuffering() {},
      }, appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver(_n: number, done: () => void) { done(); } } },
    });
  }, mode);
  await page.route('**/native/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/receiver-fixture-result', async r => { replies.push(r.request().postDataJSON()); await r.fulfill({ body: '{}' }); });
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module,alive=true,current,serial=${mode === 'handshake' ? 128 : 0},queue=[],busy=false,mode=${JSON.stringify(mode)};
M.HEAPU8=new Uint8Array(16000);M._cast_rpc_enable=()=>{};M._cast_rpc_peer=id=>current&&current.id===id?current.peer:0;
M._cast_rpc_service=id=>current&&current.id===id?3:0;M._cast_rpc_body=()=>64;M._cast_rpc_body_size=()=>current.bytes.length;M._cast_rpc_action=()=>4500;M._cast_rpc_buffer=()=>5000;M._cast_source_buffer=()=>12000;
var uri='http://cdn.bilivideo.com/upgcxcode/fixture.mp4?deadline='+Math.floor(Date.now()/1000+3600)+'&sign=private-fixture-marker';
if(mode==='handshake-akam')uri=uri.replace('cdn.bilivideo.com','upos-hz-mirrorakam.akamaized.net');
var esc=s=>s.replace(/&/g,'&amp;'),ns='urn:schemas-upnp-org:service:AVTransport:1';
function emit(action,extra='',peer=0x0a000009){if(action==='Play'&&!extra)extra='<Speed>1</Speed>';queue.push({action,extra,peer});pump();}
function pump(){if(!alive||busy||!queue.length)return;busy=true;var q=queue.shift();current={...q,id:++serial};var xml='<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:'+q.action+' xmlns:u="'+ns+'"><InstanceID>0</InstanceID>'+q.extra+'</u:'+q.action+'></s:Body></s:Envelope>';current.bytes=new TextEncoder().encode(xml);M.HEAPU8.fill(0);M.HEAPU8.set(current.bytes,64);M.HEAPU8.set(new TextEncoder().encode('"'+ns+'#'+q.action+'"'),4500);M.print('CAST:rpc:'+current.id);}
function offer(peer=0x0a000009,source=uri){emit('SetAVTransportURI','<CurrentURI>'+esc(source)+'</CurrentURI><CurrentURIMetaData></CurrentURIMetaData>',peer);}
M._cast_rpc_reply=(id,status,length)=>{if(!current||current.id!==id)return 0;var body=new TextDecoder().decode(M.HEAPU8.subarray(5000,5000+length));fetch('/receiver-fixture-result',{method:'POST',body:JSON.stringify({id,status,body})});if(mode.startsWith('handshake')&&current.action==='SetAVTransportURI'&&(id===1||mode==='handshake'&&id===129)&&status===200){setTimeout(()=>{if(alive){emit('Play');emit('GetTransportInfo');if(mode==='handshake-foreign'){emit('GetMediaInfo','',0x0a000008);offer(0x0a000009,uri+'&refresh=1');}}},20);}if(current.action==='GetPositionInfo'&&status===200)setTimeout(()=>alive&&M.print('CAST:position:0f'),0);current=undefined;busy=false;setTimeout(pump,20);return 1;};
M._cast_transition_enable=()=>{};M._cast_transition_buffer=()=>15500;var mediaCount=0;M._cast_transition_begin=(length,generation)=>{fetch('/transition-fixture-result',{method:'POST',body:JSON.stringify({generation,phase:'native-begin'})});M.print('BRIDGE:stopped');M.print('CAST:transition:closed');setTimeout(()=>{if(alive)M.print(mode==='handshake-session-source-fail'?'CAST:source:failed:0:60':'CAST:source:pass');},mode==='handshake-session-home'?1500:100);return 1;};
M._cast_source_begin=()=>{setTimeout(()=>{if(mode.startsWith('handshake-large-init')){M.print('CAST:layout:moov_first');M.print('CAST:init:42');}M.print(mode==='handshake-source-fail'?'CAST:source:failed:0:60':'CAST:source:pass');},mode.startsWith('handshake')?400:10);if(mode==='handshake-source-fail')setTimeout(()=>alive&&offer(),650);return 1;};
M._cast_media_begin=()=>{mediaCount++;M.print('BRIDGE:ready');if(mode==='handshake-session-offer-cap'&&mediaCount===1)setTimeout(()=>{for(var i=0;i<40;i++)offer();},500);if(mode.startsWith('handshake-session')&&!mode.startsWith('handshake-session-timeout')&&mode!=='handshake-session-offer-cap'&&mediaCount<(mode==='handshake-session-akam'?4:3))setTimeout(()=>{if(alive)offer(mode==='handshake-session-foreign'?0x0a000008:0x0a000009,mode==='handshake-session-policy'?uri.replace('.mp4?','.m4s?'):mode.startsWith('handshake-session-akam')?uri.replace('cdn.bilivideo.com',mode==='handshake-session-akam-denied'?'other.akamaized.net':'upos-hz-mirrorakam.akamaized.net')+'&part='+(mediaCount+1):uri+'&part='+(mediaCount+1));},700);if(mode.startsWith('handshake-session-timeout')&&mediaCount===1){setTimeout(()=>alive&&M.print('BRIDGE:request_timeout:1'),450);if(mode==='handshake-session-timeout')setTimeout(()=>alive&&offer(0x0a000009,uri+'&part=2'),6500);if(mode==='handshake-session-timeout-paused'){setTimeout(()=>alive&&emit('Pause'),2200);setTimeout(()=>alive&&emit('Play'),9000);}}if(mode.startsWith('handshake-large-init'))setTimeout(()=>alive&&M.print('BRIDGE:read_mib:4'),150);if(mode.startsWith('handshake-large-init-seek')){setTimeout(()=>alive&&emit('Seek','<Unit>REL_TIME</Unit><Target>00:00:05</Target>'),3500);setTimeout(()=>alive&&M.print('BRIDGE:read_mib:8'),3800);}setTimeout(()=>{
 if(!alive)return;
 if(mode.startsWith('handshake')){emit('GetPositionInfo');}
 if(mode==='controls'){offer();emit('GetTransportInfo');emit('Pause');emit('GetTransportInfo');emit('Play');emit('Seek','<Unit>REL_TIME</Unit><Target>00:00:05</Target>');emit('GetTransportInfo');setTimeout(()=>{if(alive){emit('GetPositionInfo');emit('Stop');emit('GetTransportInfo');emit('Play');setTimeout(()=>alive&&emit('GetTransportInfo'),500);}},1100);}
 if(mode==='foreign'){offer(0x0a000008);emit('Pause','',0x0a000008);emit('GetMediaInfo','',0x0a000008);offer(0x0a000009,uri+'&new=1');emit('GetTransportInfo');}
 if(mode.startsWith('slow-start')){offer();emit('Play');setTimeout(()=>{if(alive){emit('GetTransportInfo');emit('Play');}},4000);setTimeout(()=>{if(alive){emit('GetTransportInfo');emit('Pause');}},6800);}
 if(mode==='paused-remote-seek'){emit('Pause');setTimeout(()=>alive&&M.print('BRIDGE:resume:1'),400);}
 if(mode==='phone-seek-miss'){emit('Seek','<Unit>REL_TIME</Unit><Target>00:01:00</Target>');}
 if(mode==='phone-seek-error'){emit('Seek','<Unit>REL_TIME</Unit><Target>00:00:05</Target>');}
 if(mode==='back-seek'){emit('Seek','<Unit>REL_TIME</Unit><Target>00:00:05</Target>');}
 if(mode==='remote'){setTimeout(()=>{if(alive){emit('Pause');emit('GetTransportInfo');}},900);setTimeout(()=>alive&&emit('Pause'),2000);}
 },100);return 1;};
M.callMain=()=>{M._cast_stop=()=>{alive=false;M.print('BRIDGE:stopped');M.print('CAST:closed:0:0:0:0:0:0:0');};M.print('CAST:ready');setTimeout(()=>offer(),20);};M.onRuntimeInitialized();
` }));
  const transitions: {generation:number;phase:string}[] = [];
  await page.route('**/transition-fixture-result', async route => { transitions.push(JSON.parse(route.request().postData()!)); await route.fulfill({body:'ok'}); });
  await page.goto('/');
  if (mode.startsWith('handshake-session')) {
    await page.locator('#cast-session').click();
    await expect(page.locator('#media-status')).toContainText('playing');
    if (mode === 'handshake-session-timeout-paused') {
      await expect(page.locator('#results')).toContainText('cast.media_timeout_progress_g1');
      await expect(page.locator('#media-status')).toContainText('paused');await page.waitForTimeout(6000);
      await expect(page.locator('#media-dialog')).toBeVisible();await expect(page.locator('#results')).not.toContainText('cast.media_issue_');
      await expect(page.locator('#media-status')).toContainText('playing', {timeout:4000});
      await expect.poll(()=>page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c=>c==='play').length)).toBe(2);await page.keyboard.press('Escape');
    } else if (mode === 'handshake-session-timeout-later-stall') {
      await expect(page.locator('#results')).toContainText('cast.media_timeout_progress_g1');
      await expect(page.locator('#results')).toContainText('cast.media_timeout_unconfirmed_g1', {timeout:10000});
      await expect(page.locator('#media-dialog')).toBeHidden();await expect(page.locator('#results')).toContainText('cast.media_issue_206_28');
    } else if (mode === 'handshake-session-timeout-stall') {
      await expect(page.locator('#results')).toContainText('cast.media_timeout_unconfirmed_g1', {timeout:8000});
      await expect(page.locator('#results')).toContainText('cast.media_issue_206_28');
      await expect(page.locator('#media-dialog')).toBeHidden();expect(transitions).toHaveLength(0);
    } else if (mode === 'handshake-session-timeout-home') {
      await expect(page.locator('#results')).toContainText('cast.media_timeout_isolated_g1');
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(5500);await expect(page.locator('#media-dialog')).toBeHidden();
      await expect(page.locator('#results')).not.toContainText('cast.media_timeout_unconfirmed');expect(transitions).toHaveLength(0);
    } else if (mode === 'handshake-session-timeout') {
      await expect(page.locator('#results')).toContainText('cast.media_timeout_progress_g1');
      await expect.poll(()=>transitions.length,{timeout:10000}).toBe(1);
      await expect(page.locator('#media-status')).toContainText('/ 480.0');
      expect(await page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c=>c==='play').length)).toBe(2);
      await expect(page.locator('#results')).not.toContainText('cast.media_issue_');await page.keyboard.press('Escape');
    } else if (mode === 'handshake-session-policy' || mode === 'handshake-session-akam-denied') {
      await expect.poll(()=>replies.filter(r=>r.status===500).length).toBeGreaterThan(0);
      expect(transitions).toHaveLength(0);await page.keyboard.press('Escape');
    } else if (mode === 'handshake-session-prepare-hold') {
      await expect.poll(()=>page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c=>c==='open').length)).toBe(2);
      await expect(page.locator('#media-status')).toContainText('preparing');await page.keyboard.press('Escape');
    } else if (mode === 'handshake-session-offer-cap') {
      await expect.poll(()=>replies.filter(r=>r.body.includes('SetAVTransportURIResponse')).length).toBeGreaterThanOrEqual(41);
      expect(transitions).toHaveLength(0);await page.keyboard.press('Escape');
    } else if (mode === 'handshake-session-home') {
      await expect.poll(()=>transitions.length).toBe(1);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(1800);
      expect(await page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c=>c==='play').length)).toBe(1);
      await expect(page.locator('#media-dialog')).toBeHidden();
    } else if (mode === 'handshake-session-unclosed') {
      await expect(page.locator('#results')).toContainText('cast.transition_failed');
      expect(transitions).toHaveLength(0);
      await expect(page.locator('#media-dialog')).toBeHidden();
      await expect(page.locator('#results')).toContainText('avplay.transition_decoder_close_unconfirmed_restart_required');
      await page.locator('#cast-session').click(); await expect(page.locator('#cast-dialog')).toBeHidden();
      expect(await page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c=>c==='open').length)).toBe(1);
    } else if (mode === 'handshake-session-source-fail') {
      await expect(page.locator('#results')).toContainText('cast.source_failed_0_60');
      await expect(page.locator('#media-dialog')).toBeHidden();
      expect(await page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c=>c==='play').length)).toBe(1);
    } else if (mode === 'handshake-session-foreign') {
      await expect.poll(()=>replies.filter(r=>r.body.includes('701')).length).toBeGreaterThan(0);
      expect(transitions).toHaveLength(0);await page.keyboard.press('Escape');
    } else {
      await expect.poll(()=>transitions.length).toBe(mode==='handshake-session-akam'?3:2);
      await expect(page.locator('#media-status')).toContainText(mode==='handshake-session-akam'?'/ 960.0':'/ 720.0');
      expect(await page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c=>c==='play').length)).toBe(mode==='handshake-session-akam'?4:3);
      await page.keyboard.press('Escape');
      await expect(page.locator('#cast-session')).toBeFocused();
    }
    await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
    await page.locator('#export').click(); await expect(page.locator('#export-output')).not.toHaveValue(/private-fixture-marker/);
    if (mode === 'handshake-session') await expect(page.locator('#export-output')).toHaveValue(/cast.transition_summary_v1_0ff/);
    const exported = JSON.parse(await page.locator('#export-output').inputValue()) as {entries:{code:string}[]};
    const trace = exported.entries.map(e=>decodeOfferTrace(e.code)).reverse().find(t=>!!t);
    if (mode === 'handshake-session-timeout') expect(exported.entries.some(e=>e.code==='cast.media_timeout_progress_g1')).toBe(true);
    if (mode === 'handshake-session-timeout-stall') expect(exported.entries.some(e=>e.code==='cast.media_timeout_unconfirmed_g1')).toBe(true);
    if (mode === 'handshake-session-policy') expect(trace?.observations.some(o=>o.reason==='policy_m4s'&&o.generation===1&&o.state==='playing'&&o.session)).toBe(true);
    if (mode === 'handshake-session-akam') { expect(trace?.observations.filter(o=>o.reason==='accepted_bili_akam').length).toBe(3); expect(exported.entries.some(e=>e.code==='cast.transition_summary_v1_fff')).toBe(true); }
    if (mode === 'handshake-session-akam-denied') expect(trace?.observations.some(o=>o.reason==='policy_destination_akamaized')).toBe(true);
    if (mode === 'handshake-session-prepare-hold') expect(exported.entries.some(e=>e.code==='cast.exit_g2_preparing_s0')).toBe(true);
    if (mode === 'handshake-session-offer-cap') expect(trace?.capped).toBe(true);
    expect(errors).toEqual([]);return;
  }
  if (mode.startsWith('handshake')) {
    await page.locator('#cast-handshake').click();
    await expect.poll(()=>replies.length).toBeGreaterThanOrEqual(1);
    expect(replies[0]?.status).toBe(200);expect(replies[0]?.body).toContain('SetAVTransportURIResponse');
    if (mode.startsWith('handshake-large-init')) {
      await expect(page.locator('#media-dialog')).toBeVisible();
      await expect(page.locator('#media-status')).toContainText('约42 MiB');
      await expect(page.locator('#media-status')).toContainText('已接收4 MiB');
      if (mode.startsWith('handshake-large-init-seek')) {
        await expect(page.locator('#media-feedback')).toContainText('手机跳转中');
        await expect(page.locator('#media-status')).toContainText('正在重新读取较大索引');
        if (mode.endsWith('-home')) {
          await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
          await page.waitForTimeout(1500);
          expect(await page.evaluate(() => (globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c => c === 'play').length)).toBe(1);
          await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
        } else {
          await expect(page.locator('#media-feedback')).toContainText('手机跳转已响应');
          await expect.poll(() => page.evaluate(() => (globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c => c === 'play').length)).toBe(2);
          await expect(page.locator('#media-status')).toContainText('5.0');
          await page.keyboard.press('Escape');
        }
      } else if (mode.endsWith('-home')) {
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
        await page.waitForTimeout(2500);
        expect(await page.evaluate(() => (globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c => c === 'play').length)).toBe(0);
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
      } else {
        await expect.poll(() => page.evaluate(() => (globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c => c === 'play').length)).toBe(1);
        await page.keyboard.press('Escape');
      }
      await expect(page.locator('#media-dialog')).toBeHidden();
      await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
      await page.locator('#export').click();
      await expect(page.locator('#export-output')).toHaveValue(/cast.source_init_mib_42/);
      await expect(page.locator('#export-output')).not.toHaveValue(/private-fixture-marker/);
      expect(errors).toEqual([]); return;
    }
    if (mode === 'handshake-cancel') {
      await page.keyboard.press('Escape');await page.waitForTimeout(550);
      await expect(page.locator('#media-dialog')).toBeHidden();
      expect(await page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls)).toEqual([]);
      return;
    }
    await expect.poll(()=>replies.length).toBeGreaterThanOrEqual(3);
    expect(replies[1]?.status).toBe(200);expect(replies[2]?.body).toContain('TRANSITIONING');
    if (mode === 'handshake-source-fail') {
      await expect(page.locator('#results')).toContainText('cast.source_failed_0_60');
      await expect.poll(()=>replies.length).toBeGreaterThanOrEqual(4);expect(replies[3]?.status).toBe(500);
      await expect(page.locator('#media-dialog')).toBeHidden();
      expect(await page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls)).toEqual([]);
    } else {
      await expect(page.locator('#media-dialog')).toBeVisible();
      await expect.poll(()=>replies.some(r=>r.body.includes('<RelTime>00:00:12</RelTime>'))).toBe(true);
      expect(await page.evaluate(()=>(globalThis as unknown as {receiverCalls:string[]}).receiverCalls.filter(c=>c==='play').length)).toBe(1);
      if (mode === 'handshake-foreign') {expect(replies[3]?.status).toBe(500);expect(replies[3]?.body).not.toContain('private-fixture-marker');expect(replies[4]?.status).toBe(500);}
    }
    await page.keyboard.press('Escape');await expect(page.locator('#media-dialog')).toBeHidden();
    await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
    expect(errors).toEqual([]);return;
  }
  await page.locator('#cast-receiver').click(); await expect(page.locator('#cast-play')).toBeEnabled();
  expect(replies[0]?.status).toBe(500); expect(replies[0]?.body).not.toContain('private-fixture-marker');
  await page.locator('#cast-play').click(); await expect(page.locator('#media-dialog')).toBeVisible();
  if (mode === 'controls') {
    await expect.poll(() => replies.length).toBe(13);
    expect(replies.slice(1).map(r => [r.id, r.status])).toEqual(Array.from({length:12}, (_,i) => [i+2,200]));
    expect(replies[2]?.body).toContain('PLAYING'); expect(replies[4]?.body).toContain('PAUSED_PLAYBACK'); expect(replies[7]?.body).toContain('TRANSITIONING');
    expect(replies[8]?.body).toContain('<RelTime>00:00:05</RelTime>'); expect(replies[8]?.body).toContain('<TrackDuration>00:04:00</TrackDuration>');
    const metadata = await page.evaluate(xml => { const p=new DOMParser(); const soap=p.parseFromString(xml,'text/xml');const didl=p.parseFromString(soap.getElementsByTagName('TrackMetaData')[0]?.textContent??'','text/xml'); const res=didl.getElementsByTagName('res')[0];return {duration:res?.getAttribute('duration'),uri:res?.textContent,errors:didl.getElementsByTagName('parsererror').length}; },replies[8]!.body);
    expect(metadata.duration).toBe('00:04:00');expect(metadata.errors).toBe(0);expect(metadata.uri).toContain('&sign=private-fixture-marker');
    expect(replies[10]?.body).toContain('STOPPED'); expect(replies[12]?.body).toContain('PLAYING');
    await expect(page.locator('#results')).toContainText('cast.receiver_seek_complete');
    await expect(page.locator('#results')).toContainText('cast.position_wire_v1_0f');
  } else if (mode === 'phone-seek-miss') {
    await expect(page.locator('#results')).toContainText('cast.receiver_seek_target_nonzero');
    await expect(page.locator('#results')).toContainText('cast.receiver_seek_target_window_missed');
    await expect(page.locator('#media-status')).toContainText('playing');
  } else if (mode === 'phone-seek-error') {
    await expect(page.locator('#media-feedback')).toContainText('手机跳转未完成');
    await expect(page.locator('#results')).toContainText('avplay.seek_restart_event_player_error_connection_failed');
    await expect(page.locator('#results')).toContainText('avplay.seek_history_v1_f');
    expect(await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls.filter(c => c === 'play').length)).toBe(1);
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
    await expect(page.locator('#results')).toContainText('avplay.seek_restart_held_b0_t0'); await expect(page.locator('#media-status')).toContainText('paused');
    const held = await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls); expect(held.filter(c => c === 'play')).toHaveLength(1); expect(held).not.toContain('seek');
    await expect(page.locator('#results')).toContainText('cast.media_resume_1'); await page.locator('#media-toggle').click(); await expect(page.locator('#media-status')).toContainText('playing · 5.0');
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
  if (mode === 'controls') await expect(page.locator('#export-output')).toHaveValue(/avplay.stream_v1_w1920_h1080_b6000000_vh264_aaacl/);
  if (mode === 'phone-seek-miss') await expect(page.locator('#export-output')).toHaveValue(/cast.receiver_summary_v2_[89a-f][0-9a-f]{7}/);
  expect(await page.evaluate(() => (globalThis as unknown as { receiverCalls: string[] }).receiverCalls)).not.toContain('duration-during-seek');
  expect(errors).toEqual([]);
});

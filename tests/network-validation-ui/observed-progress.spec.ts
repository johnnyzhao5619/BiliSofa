import { test, expect } from '@playwright/test';
for (const mode of ['no-consent', 'confirmed', 'prior-missing', 'home', 'paused-watch', 'readback-other'] as const)
    test(`G3 actual-watch real Worker ${mode}`, async ({ page }) => {
        const reports: string[] = [], errors: string[] = [];
        let posts = 0;
        page.on('pageerror', e => errors.push(e.message));
        await page.clock.install();
        await page.addInitScript(mode => {
            localStorage.setItem('bilisofa.w01.progress-once.v1', JSON.stringify({ schema: 1, bvid: 'BV14GHy6bE9n', targetSec: 15, state: 'unknown' }));
            if (mode === 'prior-missing')
                localStorage.removeItem('bilisofa.w01.progress-once.v1');
            let state = 'NONE', ms = 0, listener: {
                oncurrentplaytime?: (n: number) => void;
            } = {}, timer: ReturnType<typeof setInterval> | undefined;
            let saved = JSON.stringify({ schema: 1, uid: '123456', expiresAt: Date.now() + 600000, cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t2000000000\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t2000000000\tbili_jct\t' + 'a'.repeat(32) + '\n' });
            Object.assign(globalThis, { tizen: { application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliNet001.Probe' } }) }, systeminfo: { getPropertyValue(_k: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } }, keymanager: { getData() { if (!saved)
                            throw { name: 'NotFoundError' }; return saved; }, removeData() { saved = ''; }, saveData() { throw Error('must not overwrite'); } } }, webapis: { appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver(_v: number, ok: () => void) { ok(); } }, avplay: { getState: () => state, open() { state = 'IDLE'; }, setListener(v: typeof listener) { listener = v; }, setDisplayRect() { }, prepareAsync(ok: () => void) { setTimeout(() => { state = 'READY'; ok(); }, 5); }, play() { state = 'PLAYING'; timer = setInterval(() => { ms += mode === 'paused-watch' && ms >= 5000 ? 0 : 500; listener.oncurrentplaytime?.(ms); }, 500); }, pause() { state = 'PAUSED'; }, seekTo() { }, stop() { state = 'IDLE'; clearInterval(timer); }, close() { state = 'NONE'; clearInterval(timer); } } } });
        }, mode);
        await page.route('**/fixture-report', async (r) => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
        await page.route('**/fixture-write', async (r) => { posts++; await r.fulfill({ body: '{}' }); });
        await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module,status=200,ranged=0;var cdn='https://fixture.bilivideo.com/synthetic.m4s?deadline='+Math.floor(Date.now()/1000+3600)+'&sign=private-synthetic';
var t=v=>({id:v?16:30216,baseUrl:cdn,mimeType:v?'video/mp4':'audio/mp4',codecs:v?'avc1.64001E':'mp4a.40.2',bandwidth:v?500000:66000,width:640,height:360,SegmentBase:{Initialization:'0-914',indexRange:'915-6546'}});
M._guest_response_ptr=()=>0;M._guest_response_length=()=>M.HEAPU8.length;M._guest_http_status=()=>status;M._guest_curl_status=()=>0;M._guest_range_valid=()=>ranged;
M.callMain=a=>{if(a[0]==='http'){M._probe_stop=()=>M.print('HTTP:stopped');fetch('/fixture-report',{method:'POST',body:a[1]});M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),5);return;}
if(a[0]==='bridge'){M._bridge_stop=()=>M.print('BRIDGE:stopped');M.print('BRIDGE:ready');return;}
status=200;ranged=0;var data;
if(a[0]==='guest-view')data={bvid:'BV14GHy6bE9n',cid:123,title:'合成详情',owner:{name:'合成UP'},state:0,rights:{pay:0,ugc_pay:0,is_stein_gate:0},pages:[{cid:123,page:1,from:'vupload',duration:95}]};
else if(a[0]==='guest-playurl')data={quality:16,timelength:95000,dash:{duration:95,video:[t(true)],audio:[t(false)]}};
else if(a[0]==='guest-range'){status=206;ranged=1;}else throw Error('unexpected operation');
M.HEAPU8=new TextEncoder().encode(JSON.stringify({code:0,data}));M.print('GUEST:closed');};M.onRuntimeInitialized();` }));
        await page.route(/\/(account|account-readback|observed-progress-post)\/probe.js$/, r => r.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module,length=0,closed=false;M.HEAPU8=new Uint8Array(262144);M._auth_input_ptr=()=>1024;M._auth_input_capacity=()=>4096;M._auth_body_ptr=()=>8192;M._auth_body_length=()=>length;M._auth_http_status=()=>200;M._auth_curl_status=()=>0;M._auth_import_cookies=()=>1;M._auth_readback_prepare=()=>1;M._auth_response_clear=()=>{M.HEAPU8.fill(0,8192,139264);length=0;};
M._auth_stop=()=>{closed=true;M.print('AUTH:closed');};
function response(op){var data=op===2?{isLogin:true,mid:123456,uname:'synthetic-name',wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'0'.repeat(32)+'.png',sub_url:'https://i1.hdslb.com/bfs/wbi/'+'f'.repeat(32)+'.png'}}:op===3?{bvid:'BV14GHy6bE9n',aid:117400733288351,pages:[{cid:42548528128,duration:95}]}:op===4?{last_play_time:0,last_play_cid:0}:{login_mid:123456,last_play_time:${mode === 'readback-other' ? 0 : 20000},last_play_cid:${mode === 'readback-other' ? 0 : 42548528128}};var bytes=new TextEncoder().encode(JSON.stringify(op===5&&location.href.includes('observed-progress')?{code:0}:{code:0,data}));M.HEAPU8.set(bytes,8192);length=bytes.length;M.print('AUTH:response:'+op);}
M._auth_begin=op=>{setTimeout(()=>{if(!closed)response(op);},5);return 1;};
M._progress_prepare=n=>{var s=new TextDecoder().decode(M.HEAPU8.slice(1024,1024+n)).trim().split('\\n');if(s.length!==8||Number(s[5])<20||Number(s[6])<18)throw Error('unobserved metrics');return 1;};
M._progress_attempt=()=>{fetch('/fixture-write');setTimeout(()=>{var b=new TextEncoder().encode('{"code":0}');M.HEAPU8.set(b,8192);length=b.length;M.print('AUTH:response:5');},5);return 1;};M.callMain=()=>M.print('AUTH:ready');M.onRuntimeInitialized();` }));
        await page.goto('/');
        await expect.poll(() => reports.join('')).toContain('observed.ready');
        await expect(page.locator('#confirm-progress')).toBeDisabled();
        const old = await page.evaluate(() => localStorage.getItem('bilisofa.w01.progress-once.v1'));
        await page.locator('#run').click();
        await expect(page.locator('#media-stop')).toBeVisible();
        await expect(page.locator('#media-status')).toContainText('实际进度');
        if (mode === 'home') {
            await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
            await page.clock.runFor(25000);
            await expect(page.locator('#confirm-progress')).toBeDisabled();
            expect(posts).toBe(0);
            expect(errors).toEqual([]);
            return;
        }
        await page.clock.runFor(mode === 'paused-watch' ? 33000 : 22000);
        if (mode === 'paused-watch') {
            await expect.poll(() => reports.join('')).toContain('observed.watch_not_eligible_no_write');
            await expect(page.locator('#confirm-progress')).toBeDisabled();
            expect(posts).toBe(0);
            return;
        }
        await expect.poll(() => reports.join('')).toContain('observed.watch_ready');
        await expect(page.locator('#confirm-progress')).toBeDisabled();
        if (mode === 'no-consent') {
            expect(posts).toBe(0);
            return;
        }
        await page.locator('#ack-prior').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#ack-prior')).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#confirm-progress')).toBeEnabled();
        await page.locator('#confirm-progress').click();
        if (mode === 'readback-other')
            await page.clock.runFor(5000);
        await expect.poll(() => reports.join('')).toContain(mode === 'prior-missing' ? 'observed.precondition_failed_no_write' : mode === 'readback-other' ? 'observed.write_unknown_no_retry' : 'observed.write_readback_confirmed');
        expect(posts).toBe(mode === 'prior-missing' ? 0 : 1);
        expect(await page.evaluate(() => localStorage.getItem('bilisofa.w01.progress-once.v1'))).toBe(old);
        await expect(page.locator('#confirm-progress')).toBeDisabled();
        expect(reports.join('')).not.toMatch(/synthetic-name|123456|SESSDATA|bili_jct|cookieLines|sign=|10\.0\.0\.9/);
        expect(errors).toEqual([]);
    });

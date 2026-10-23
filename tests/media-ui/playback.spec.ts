import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const native = readFileSync('tests/media-ui/native-fixture.js', 'utf8');
async function setup(page: Page, variant = 'normal', decoder = 'normal') {
  await page.route('**/native/manifest.json', route => route.fulfill({contentType:'application/json',body:'{}'}));
  await page.route('**/native/probe.js', route => route.fulfill({contentType:'text/javascript',body:native.replace('__VARIANT__',variant)}));
  await page.addInitScript(({ decoder }) => {
    let state = 'NONE', listener: {oncurrentplaytime?:(ms:number)=>void;onstreamcompleted?:()=>void} = {}, time = 0, opened = 0, played = 0, closed = 0;
    let saved: (() => void) | undefined, savedListener = listener; const saver: number[] = [], operations: string[] = [];
    const loop = setInterval(() => { if (state === 'PLAYING') { time += 100; listener.oncurrentplaytime?.(time); } }, 100); void loop;
    Object.assign(globalThis, { webapis:{
      avplay: {
        getState:() => state,
        open(url:string) { if (state !== 'NONE' || !/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/manifest\.mpd$/.test(url)) throw Error('fixture.unowned_source'); state = 'IDLE'; opened++; time = 0; operations.push('open'); },
        setListener(value:typeof listener) { listener = value; savedListener = value; }, setDisplayRect() {},
        prepareAsync(done:()=>void) { const complete = () => { state = 'READY'; done(); }; if (decoder === 'hold-prepare') saved = complete; else setTimeout(complete, 0); },
        play() { state = 'PLAYING'; played++; }, pause() { state = 'PAUSED'; },
        seekTo(ms:number,done:()=>void) { operations.push('seek'); setTimeout(() => { time = ms; listener.oncurrentplaytime?.(time); done(); }, 30); },
        stop() { state = 'IDLE'; operations.push('stop'); },
        close() { state = decoder === 'unclosed' ? 'IDLE' : 'NONE'; closed++; operations.push('close'); },
      }, appcommon:{ AppCommonScreenSaverState:{SCREEN_SAVER_ON:1,SCREEN_SAVER_OFF:0},setScreenSaver(value:number,done:()=>void) { saver.push(value); done(); } },
    }, mediaFixture:{ snapshot:() => ({state,opened,played,closed,saver,operations}), late() { saved?.(); savedListener.oncurrentplaytime?.(999999); }, end() { listener.onstreamcompleted?.(); } } });
  }, {decoder});
  await page.goto('/'); await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused(); await page.getByRole('button',{name:'读取游客热门'}).click();
  await expect(page.locator('.popular-grid button')).toHaveCount(4); await expect(page.locator('.popular-grid button').first()).toBeFocused();
}
const snapshot = (page:Page) => page.evaluate(() => (globalThis as unknown as {mediaFixture:{snapshot():{state:string;opened:number;played:number;closed:number;saver:number[];operations:string[]}}}).mediaFixture.snapshot());
async function play(page:Page) { await page.keyboard.press('Enter'); await expect.poll(async () => (await snapshot(page)).state).toBe('PLAYING'); await expect(page.getByRole('button',{name:'返回原卡'})).toBeFocused(); }
async function hidden(page:Page, value:boolean) { await page.evaluate(value => { Object.defineProperty(document,'hidden',{configurable:true,value}); document.dispatchEvent(new Event('visibilitychange')); },value); }
test('W02 actual guest Workers parse public data, play an owned bridge and restore remote focus without credential storage', async ({page}, info) => {
  await setup(page);await expect(page.locator('.popular-grid button').last()).toBeInViewport({ratio:1});await expect(page.getByRole('button',{name:'下一页'})).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath('popular.png')});await expect(page.locator('img')).toHaveCount(0);await page.keyboard.press('ArrowRight');await expect(page.locator('.popular-grid button').nth(1)).toBeFocused();await play(page);
  await expect(page.getByRole('button',{name:'暂停 / 继续'})).toBeEnabled();await page.screenshot({path:info.outputPath('player.png')});await page.getByRole('button',{name:'暂停 / 继续'}).click();expect((await snapshot(page)).state).toBe('PAUSED');
  await page.getByRole('button',{name:'跳到 5 秒'}).click();await expect(page.getByRole('timer')).toContainText('5.0');expect((await snapshot(page)).state).toBe('PAUSED');await page.getByRole('button',{name:'暂停 / 继续'}).click();
  await page.keyboard.press('Escape');await expect(page.locator('.popular-grid button').nth(1)).toBeFocused();expect((await snapshot(page)).state).toBe('NONE');expect((await snapshot(page)).saver.at(-1)).toBe(1);
  await page.getByRole('button',{name:'下一页'}).click();await expect(page.locator('#pages [role=status]')).toHaveText('第 2 页');await expect(page.getByRole('button',{name:'下一页'})).toBeDisabled();expect(await page.evaluate(()=>Object.keys(localStorage))).toHaveLength(0);
});
test('W02 Back during preparation drains bridge, refuses stale prepare and never autoplays the next card', async ({page}) => {
  await setup(page,'normal','hold-prepare');await page.keyboard.press('Enter');await expect.poll(async () => (await snapshot(page)).state).toBe('IDLE');await page.keyboard.press('Escape');await expect(page.locator('.popular-grid button').first()).toBeFocused();
  await page.evaluate(() => (globalThis as unknown as {mediaFixture:{late():void}}).mediaFixture.late());await page.waitForTimeout(100);expect((await snapshot(page)).played).toBe(0);await expect(page.locator('#overlays')).toBeEmpty();
});
test('W02 Home stops playback and foreground requires an explicit new public selection', async ({page}) => {
  await setup(page);await play(page);await hidden(page,true);await expect(page.locator('#overlays')).toBeEmpty();expect((await snapshot(page)).state).toBe('NONE');
  await hidden(page,false);await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();expect((await snapshot(page)).played).toBe(1);await page.getByRole('button',{name:'读取游客热门'}).click();await expect(page.locator('.popular-grid button')).toHaveCount(4);await play(page);expect((await snapshot(page)).played).toBe(2);await page.keyboard.press('Escape');
});
test('W02 decoder closure unknown blocks shell and second playback instead of reusing global AVPlay', async ({page}) => {
  await setup(page,'normal','unclosed');await play(page);await page.keyboard.press('Escape');await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');await expect(page.locator('.popular-grid')).toHaveCount(0);expect((await snapshot(page)).opened).toBe(1);
});
test('W02 fatal Worker outcome closes decoder and leaves unknown cleanup blocked without leaking raw failure', async ({page}) => {
  await setup(page,'fatal');await play(page);await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');expect((await snapshot(page)).state).toBe('NONE');await expect(page.locator('body')).not.toContainText('private-runtime-failure');
});
test('W02 decoder completion returns to the same card only after native bridge acknowledgement', async ({page}) => {
  await setup(page);await play(page);await page.evaluate(() => (globalThis as unknown as {mediaFixture:{end():void}}).mediaFixture.end());await expect(page.locator('.popular-grid button').first()).toBeFocused();await expect(page.locator('#feedback')).toHaveText('播放结束');expect((await snapshot(page)).state).toBe('NONE');
});
for(const [variant,code,label] of [['source-unsupported','ugc.view_unsupported','请选其他视频'],['source-http','ugc.playurl_http_403','播放源读取失败']]){
 test(`W02 ${variant} retains the exact source failure without preparing or leaking; another card still plays`,async({page},info)=>{
  await setup(page,variant);await page.keyboard.press('Enter');await expect(page.locator('.popular-grid button').first()).toBeFocused();await expect(page.locator('#feedback')).toContainText(code!);await expect(page.locator('#feedback')).toContainText(label!);expect((await snapshot(page)).opened).toBe(0);expect((await snapshot(page)).played).toBe(0);
  await page.screenshot({path:info.outputPath('source-failure.png')});await expect(page.locator('#feedback')).toBeInViewport({ratio:1});
  await page.keyboard.press('ArrowRight');await play(page);expect((await snapshot(page)).opened).toBe(1);await page.keyboard.press('Escape');await page.getByRole('button',{name:'设置与本地记录'}).click();await page.getByRole('button',{name:'查看脱敏诊断'}).click();
  const report=await page.locator('pre').textContent();expect(report).toContain(code!);expect(report).not.toMatch(/BV[A-Za-z0-9]{10}|bilivideo|https?:|SESSDATA|bili_jct/);await page.getByRole('button',{name:'清除本次诊断'}).click();await expect(page.locator('pre')).not.toContainText(code!);
 });
}

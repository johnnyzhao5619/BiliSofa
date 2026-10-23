import {test,expect}from'@playwright/test';
import {setup,snapshot,tick}from'./fixture.ts';
test('W04 whole workspace keeps video layer visible, previews intent without seeking and restores card focus on Back',async({page},info)=>{
  // The synthetic parts are 8–9 s, shorter than the 10 s default step (ADR-088 D3); keep this flow on 5 s.
  await page.addInitScript(()=>{if(!localStorage.getItem('bilisofa.local.v1.guest'))localStorage.setItem('bilisofa.local.v1.guest',JSON.stringify({schema:1,preferences:{resumePrompt:true,jumpSeconds:5},resume:[]}));});
  const errors=await setup(page);await expect(page.locator('body')).toHaveClass('playing-media');await expect(page.locator('#av-player')).toBeVisible();
  await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).state).toBe('PAUSED');
  const before=(await snapshot(page)).time;await page.getByRole('button',{name:'预览前进 5 秒',exact:true}).click();await expect(page.getByRole('timer')).toContainText('预览');expect((await snapshot(page)).time).toBe(before);
  await page.keyboard.press('Escape');await expect(page.getByRole('timer')).not.toContainText('预览');await expect(page.getByRole('button',{name:'返回原卡'})).toBeVisible();expect((await snapshot(page)).time).toBe(before);
  await page.getByRole('button',{name:'预览前进 5 秒',exact:true}).click();await page.getByRole('button',{name:'确认跳转',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).time).toBeGreaterThanOrEqual(5000);expect((await snapshot(page)).state).toBe('PAUSED');
  await expect(page.locator('.vod-panel [role=status]')).toHaveText('已暂停');await expect(page.getByRole('timer')).toContainText('5.');await page.screenshot({path:info.outputPath('paused-preview.png')});await page.getByRole('button',{name:'返回原卡'}).click();await expect(page.locator('.popular-grid button').first()).toBeFocused();expect((await snapshot(page)).state).toBe('NONE');expect(errors).toEqual([]);
});
test('W04 paused track replacement preserves position/pause while allowing actual codec candidates',async({page})=>{
  const errors=await setup(page);await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();await tick(page,3200);
  await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await expect(page.getByRole('button',{name:/720P.*HEVC/})).toBeEnabled();
  await page.getByRole('button',{name:/480P.*AVC/}).click();await expect.poll(async()=>(await snapshot(page)).opened).toBe(2);await expect(page.locator('.vod-panel [role=status]')).toHaveText('已暂停');expect((await snapshot(page)).state).toBe('READY');expect((await snapshot(page)).time).toBe(3200);
  const operations=(await snapshot(page)).operations;expect(operations.indexOf('close')).toBeLessThan(operations.lastIndexOf('open'));
  await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await page.getByRole('button',{name:'切换到音轨',exact:true}).click();await page.getByRole('button',{name:/AAC.*64 kbps/}).click();await expect.poll(async()=>(await snapshot(page)).opened).toBe(3);await expect(page.locator('.vod-panel [role=status]')).toHaveText('已暂停');expect((await snapshot(page)).state).toBe('READY');
  await page.getByRole('button',{name:'返回原卡'}).click();expect(errors).toEqual([]);
});
test('W04 explicit P2 selection uses a new source and saves P2 independently from P1',async({page})=>{
  const errors=await setup(page);await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();await tick(page,3200);
  await page.getByRole('button',{name:'选择分P',exact:true}).click();await page.getByRole('button',{name:'P2 · 第二P',exact:true}).click();
  await expect(page.locator('.vod-panel h2')).toContainText('P2');await expect.poll(async()=>(await snapshot(page)).opened).toBe(2);await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();await tick(page,4200);await page.getByRole('button',{name:'返回原卡'}).click();
  const stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));expect(Object.keys(stored)).toContain('bilisofa.local.v1.guest');expect(Object.keys(stored)).toContain('bilisofa.parts.v1.guest');
  expect(stored['bilisofa.local.v1.guest']).toContain('3200');expect(stored['bilisofa.parts.v1.guest']).toContain('4200');expect(stored['bilisofa.parts.v1.guest']).toContain('"part":2');expect(errors).toEqual([]);
});
test('W04 collection keeps unavailable entries inert and only explicit selection starts another item',async({page})=>{
  const errors=await setup(page);await page.getByRole('button',{name:'合集',exact:true}).click();await expect(page.getByRole('button',{name:/失效条目/})).toBeDisabled();
  expect((await snapshot(page)).opened).toBe(1);await page.getByRole('button',{name:'合集第二项',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).opened).toBe(2);await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'返回原卡'}).click();expect(errors).toEqual([]);
});
test('W04 natural end advances only after explicit continuous mode, resets rate and Home drains active media',async({page})=>{
  const errors=await setup(page);await page.getByRole('button',{name:'倍速：1×',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).rate).toBe(2);
  await page.getByRole('button',{name:'连播：关闭',exact:true}).click();await page.evaluate(()=>(globalThis as unknown as {mediaFixture:{end():void}}).mediaFixture.end());
  await expect.poll(async()=>(await snapshot(page)).opened).toBe(2);await expect(page.locator('.vod-panel h2')).toContainText('P2');expect((await snapshot(page)).rate).toBe(1);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(async()=>(await snapshot(page)).state).toBe('NONE');await expect(page.locator('body')).not.toHaveClass('playing-media');expect(errors).toEqual([]);
});
test('W04 default natural end stays stopped and single-repeat reopens only a fully closed source',async({page})=>{
  const errors=await setup(page);await page.evaluate(()=>(globalThis as unknown as {mediaFixture:{end():void}}).mediaFixture.end());await expect(page.locator('.vod-panel [role=status]')).toHaveText('播放结束');expect((await snapshot(page)).opened).toBe(1);
  await page.getByRole('button',{name:'从头重播',exact:true}).click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await page.getByRole('button',{name:'循环：关闭',exact:true}).click();
  await page.evaluate(()=>(globalThis as unknown as {mediaFixture:{end():void}}).mediaFixture.end());await expect.poll(async()=>(await snapshot(page)).opened).toBe(3);await expect(page.locator('.vod-panel h2')).toContainText('P1');
  await page.getByRole('button',{name:'返回原卡'}).click();expect(errors).toEqual([]);
});
test('W04 local queue uses the production source lane, and confirmed natural end advances the fixed queue once',async({page})=>{
  const errors=await setup(page);
  await page.getByRole('button',{name:'加入本机队列 · P1',exact:true}).click();await page.getByRole('button',{name:'返回原卡'}).click();
  await page.locator('.popular-grid button').nth(1).click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'加入本机队列 · P1',exact:true}).click();await page.getByRole('button',{name:'返回原卡'}).click();
  await page.getByRole('button',{name:'本机播放队列',exact:true}).click();await expect(page.locator('.local-queue-grid button')).toHaveCount(2);
  await page.getByRole('switch',{name:'播完自动下一项',exact:true}).click();await page.locator('.local-queue-grid button').first().click();await page.getByRole('button',{name:'从本项开始播放',exact:true}).click();
  await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await expect(page.locator('#queue-media-heading')).toContainText('1/2');
  const opened=(await snapshot(page)).opened;
  await page.evaluate(()=>(globalThis as unknown as {mediaFixture:{end():void}}).mediaFixture.end());
  await expect.poll(async()=>(await snapshot(page)).opened).toBe(opened+1);await expect(page.locator('#queue-media-heading')).toContainText('2/2');
  await page.getByRole('button',{name:'停止并返回',exact:true}).click();expect((await snapshot(page)).state).toBe('NONE');expect(errors).toEqual([]);
});
test('W04 manually changing P offers the fixed-identity resume for that P and lets an explicit from-start choice override it',async({page})=>{
  const errors=await setup(page);await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();await tick(page,3500);
  await page.getByRole('button',{name:'选择分P',exact:true}).click();await page.getByRole('button',{name:'P2 · 第二P',exact:true}).click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();await tick(page,4200);
  await page.getByRole('button',{name:'选择分P',exact:true}).click();await page.getByRole('button',{name:'P1 · 第一P',exact:true}).click();
  await expect(page.getByRole('heading',{name:/继续 第一P/})).toBeVisible();await page.getByRole('button',{name:'继续观看 · 3 秒',exact:true}).click();
  await expect.poll(async()=>(await snapshot(page)).opened).toBe(3);await expect(page.locator('.vod-panel h2')).toContainText('P1');await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();expect((await snapshot(page)).time).toBeGreaterThanOrEqual(3500);
  await page.getByRole('button',{name:'选择分P',exact:true}).click();await page.getByRole('button',{name:'P2 · 第二P',exact:true}).click();await expect(page.getByRole('button',{name:'继续观看 · 4 秒',exact:true})).toBeVisible();await page.getByRole('button',{name:'从头播放',exact:true}).click();
  await expect.poll(async()=>(await snapshot(page)).opened).toBe(4);await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();expect((await snapshot(page)).time).toBeLessThan(1000);await page.getByRole('button',{name:'返回原卡'}).click();expect(errors).toEqual([]);
});
test('W04 next item and a later page bind closest compatible video/audio, preserving semantic intent without carrying catalog keys',async({page})=>{
 const errors=await setup(page,true,'package',true);await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await page.getByRole('button',{name:/480P.*AVC/}).click();await expect.poll(async()=>(await snapshot(page)).opened).toBe(2);
 await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await page.getByRole('button',{name:'切换到音轨',exact:true}).click();await page.getByRole('button',{name:/AAC.*192 kbps/}).click();await expect.poll(async()=>(await snapshot(page)).opened).toBe(3);
 await page.getByRole('button',{name:'合集',exact:true}).click();await page.getByRole('button',{name:'合集第二项',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).opened).toBe(4);await expect(page.locator('.vod-panel [role=status]')).toContainText('相近的可用');
 await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await expect(page.getByRole('button',{name:/360P.*AVC/})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'切换到音轨',exact:true}).click();await expect(page.getByRole('button',{name:/AAC.*64 kbps/})).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Escape');await page.getByRole('button',{name:'返回原卡'}).click();
 await page.locator('.popular-grid button').first().click();const resume=page.getByRole('button',{name:'从头播放',exact:true});if(await resume.isVisible())await resume.click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await expect(page.getByRole('button',{name:/480P.*AVC/})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'切换到音轨',exact:true}).click();await expect(page.getByRole('button',{name:/AAC.*192 kbps/})).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

test('W04 real high-codec prepare rejection automatically selects actual AVC, retains pause/time and keeps the original preference',async({page})=>{
 const errors=await setup(page);await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();await tick(page,3200);
 await page.evaluate(()=>(globalThis as unknown as {mediaFixture:{failPrepare(n:number):void}}).mediaFixture.failPrepare(1));
 await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await page.getByRole('button',{name:/720P.*HEVC/}).click();
 await expect.poll(async()=>(await snapshot(page)).opened).toBe(3);await expect(page.locator('.vod-panel [role=status]')).toContainText('相近的可用');expect((await snapshot(page)).time).toBe(3200);expect((await snapshot(page)).state).toBe('READY');
 await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await expect(page.getByRole('button',{name:/480P.*AVC/})).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Escape');await page.getByRole('button',{name:'返回原卡'}).click();
 await page.locator('.popular-grid button').first().click();const resume=page.getByRole('button',{name:'从头播放',exact:true});await expect(resume).toBeVisible();await resume.click();await expect.poll(async()=>(await snapshot(page)).opened).toBe(4);await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();await expect(page.getByRole('button',{name:/720P.*HEVC/})).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

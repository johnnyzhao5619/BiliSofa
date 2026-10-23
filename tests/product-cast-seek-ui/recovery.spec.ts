import {fixture as interactions} from '../product-interactions-ui/fixture.ts';
import {snapshot} from '../w04-media-ui/fixture.ts';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup,use,library,home} from '../product-library-ui/fixture.ts';
async function fixture(page:Page){
 const f=await setup(page,false);
 await page.addInitScript(()=>{
  const value={schema:1,id:'bili_101',uid:'101',name:'合成账号',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n.bilibili.com\tTRUE\t/\tTRUE\t0\tDedeUserID\t101\n'};
  const bytes=new Map([['bilisofa.session.v1.slot0',JSON.stringify(value)]]);
  Object.assign(globalThis,{recoveryFixture:{keys:()=>[...bytes.keys()],expired:()=>{value.expiresAt=Date.now()-1;bytes.set('bilisofa.session.v1.slot0',JSON.stringify(value));}},tizen:{keymanager:{getData:({name}:{name:string})=>{if(!bytes.has(name))throw {name:'NotFoundError'};return bytes.get(name);},saveData:(name:string,raw:string,_password:null,done:()=>void)=>{if(bytes.has(name))throw Error('duplicate');bytes.set(name,raw);setTimeout(done,0);},removeData:({name}:{name:string})=>{if(!bytes.delete(name))throw {name:'NotFoundError'};}}}});
 });
 await page.reload();await use(page);return f;
}
async function expire(page:Page,f:Awaited<ReturnType<typeof fixture>>){
 f.mode('watchlater','login');await library(page);await page.locator('[data-focus-id=library-tab-watchlater]').click();await expect(page.locator('.tv-account')).toContainText('更新登录会话');await expect(page.locator('[data-focus-id=add-account]')).toBeFocused();
}
test('R06 private read expiry removes private cards, same-account QR returns to original library tab without autoplay or POST',async({page})=>{
 const f=await fixture(page);await expire(page,f);await expect(page.locator('#pages .tv-library-grid button.tv-library-card')).toHaveCount(0);f.mode('watchlater','normal');await page.locator('[data-focus-id=add-account]').click();await expect(page.locator('[data-focus-id=nav-library]')).toHaveAttribute('aria-current','page');await expect(page.locator('[data-focus-id=library-tab-watchlater]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#pages .tv-library-grid button.tv-library-card').first()).toContainText('第1页');await expect(page.locator('.vod-player-panel')).toHaveCount(0);
 expect(await page.evaluate(()=>(globalThis as unknown as {recoveryFixture:{keys():string[]}}).recoveryFixture.keys())).toEqual(['bilisofa.session.v1.slot0','bilisofa.session.v2.slot0.bank0']);expect(await page.evaluate(()=>localStorage.getItem('bilisofa.w01.progress-once.v1'))).toBe('unknown');await page.screenshot({path:'.local/u4-cast-seek/retained-restored.png'});expect(f.errors).toEqual([]);
});
test('R06 guest cancellation keeps stored account and journals',async({page})=>{
 const session=await fixture(page);await expire(page,session);await page.screenshot({path:'.local/u4-cast-seek/retained-login-required.png'});await page.locator('[data-focus-id=guest]').click();await expect(page.locator('[data-focus-id=nav-home]')).toHaveAttribute('aria-current','page');await page.getByRole('button',{name:'账号',exact:true}).click();await expect(page.locator('[data-focus-id=use-bili_101]')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('bilisofa.w01.progress-once.v1'))).toBe('unknown');expect(session.errors).toEqual([]);
});
test('R06 explicit same-account refresh closes old authority and returns account page after verified QR',async({page})=>{
 const f=await fixture(page);await page.getByRole('button',{name:'账号',exact:true}).click();await page.locator('[data-focus-id=renew-account]').click();await expect(page.locator('[data-focus-id=add-account]')).toBeFocused();await page.locator('[data-focus-id=add-account]').click();await expect(page.locator('[data-focus-id=account-details-open]')).toBeEnabled();await expect(page.locator('.tv-account')).toContainText('当前身份：');expect(f.errors).toEqual([]);
});
test('R06 wrong QR identity is rejected without replacing the protected session or returning private data',async({page})=>{
 const f=await fixture(page);await expire(page,f);await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','normal').replace("currentUid = '101'","currentUid = '202'")}));await page.locator('[data-focus-id=add-account]').click();await expect(page.locator('.tv-account [role=status]')).toContainText('请使用原账号扫码');expect(await page.evaluate(()=>(globalThis as unknown as {recoveryFixture:{keys():string[]}}).recoveryFixture.keys())).toEqual(['bilisofa.session.v1.slot0']);await expect(page.locator('[data-focus-id=add-account]')).toBeEnabled();expect(f.errors).toEqual([]);
});
test('R06 Home cancels pending QR, foreground revalidates and keeps safe destination, no stale QR or automatic playback',async({page})=>{
 const f=await fixture(page);await expire(page,f);await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','hold')}));await page.locator('[data-focus-id=add-account]').click();await expect(page.locator('canvas')).toBeVisible();await home(page,true);await expect(page.locator('canvas')).toHaveCount(0);f.mode('watchlater','normal');await page.unroute('**/identity/probe.js');await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','normal')}));await home(page,false);await expect(page.locator('canvas')).toHaveCount(0);await expect(page.locator('.vod-player-panel')).toHaveCount(0);expect(f.errors).toEqual([]);
});

test('R06 Back during QR cancels exchange once and returns reachable QR entry without navigating away',async({page})=>{
 const f=await fixture(page);await expire(page,f);await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','hold')}));await page.locator('[data-focus-id=add-account]').click();await expect(page.locator('canvas')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('canvas')).toBeHidden();await expect(page.locator('.tv-account [role=status]')).toHaveText('扫码已取消；会话和本机记录未删除');await expect(page.locator('[data-focus-id=add-account]')).toBeFocused();expect(f.errors).toEqual([]);
});
test('R06 interaction lane authentication loss stops decoder and opens whole-app recovery without POST',async({page})=>{
 const f=await interactions(page);f.mode('watch-login');await page.locator('[data-focus-id=vod-action-watch-later]').click();await expect(page.locator('.tv-account')).toContainText('更新登录会话');await expect.poll(async()=>(await snapshot(page)).state).toBe('NONE');expect(f.posts()).toHaveLength(0);await expect(page.locator('.interaction-panel')).toHaveCount(0);expect(f.errors).toEqual([]);
});

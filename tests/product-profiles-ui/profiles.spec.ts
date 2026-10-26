import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup} from '../w04-media-ui/fixture.ts';
// ADR-099: a cold start asks who is watching (saved accounts, 游客浏览, 添加账号); without accounts a
// one-time welcome; Back keeps the guest; only the chosen account id is remembered.
const identity=readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
async function launch(page:Page,{accounts=1,welcome=false,expired=false}={}){
 await page.route('**/identity/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:identity}));
 if(welcome)await page.addInitScript(()=>{if(!sessionStorage.getItem('fixture.started')){sessionStorage.setItem('fixture.started','1');sessionStorage.setItem('fixture.welcome','1');localStorage.removeItem('bilisofa.launch-guest.v1');}});
 await page.addInitScript(({accounts,expired})=>{
  const secrets=new Map<string,string>();for(const [slot,uid] of [['0','101'],['1','202']].slice(0,accounts))secrets.set('bilisofa.session.v1.slot'+slot,JSON.stringify({schema:1,id:'bili_'+uid,uid,name:'合成'+uid,expiresAt:expired?Date.now()-1000:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t'+'a'.repeat(32)+'\n.bilibili.com\tTRUE\t/\tTRUE\t0\tDedeUserID\t'+uid+'\n'}));
  Object.assign(globalThis,{tizen:{keymanager:{getData({name}:{name:string}){if(!secrets.has(name))throw {name:'NotFoundError'};return secrets.get(name);},saveData(){throw Error('fixture.save_forbidden');},removeData(){throw Error('fixture.remove_forbidden');}}}});
 },{accounts,expired});
 return mediaSetup(page,false);
}
const chooser=(page:Page)=>page.locator('.tv-launch');
test('ADR-099 with saved accounts the app opens on 谁在观看, one card per account, focus on the first, plus guest and add',async({page})=>{
 const errors=await launch(page,{accounts:2});await expect(chooser(page).locator('h1')).toHaveText('谁在观看？');
 await expect(page.locator('.tv-launch-card')).toHaveCount(4);await expect(page.locator('[data-focus-id=launch-account-bili_101]')).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(page.locator('[data-focus-id=launch-account-bili_202]')).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-099 choosing an account verifies it, closes the chooser and is remembered for the next launch',async({page})=>{
 const errors=await launch(page,{accounts:2});await page.locator('[data-focus-id=launch-account-bili_202]').click();
 await expect(chooser(page)).toHaveCount(0);await expect(page.locator('[data-focus-id=nav-home]')).toHaveAttribute('aria-current','page');
 expect(await page.evaluate(()=>localStorage.getItem('bilisofa.last-profile.v1'))).toBe('bili_202');
 await page.reload();await expect(page.locator('[data-focus-id=launch-account-bili_202]')).toBeFocused();await expect(page.locator('[data-focus-id=launch-account-bili_202]')).toContainText('上次使用');
 const raw=await page.evaluate(()=>JSON.stringify(localStorage));expect(raw).not.toContain('SESSDATA');expect(raw).not.toContain('synthetic-only');expect(errors).toEqual([]);
});
test('ADR-099 Back on the chooser keeps the guest and reads nothing private',async({page})=>{
 const errors=await launch(page);await expect(chooser(page)).toBeVisible();await page.keyboard.press('Escape');
 await expect(chooser(page)).toHaveCount(0);await page.locator('[data-focus-id=nav-settings]').click();await expect(page.locator('#pages')).toContainText('使用 合成101');expect(errors).toEqual([]);
});
test('ADR-099 without saved accounts a one-time welcome offers sign-in or guest; guest is not asked again',async({page})=>{
 const errors=await launch(page,{accounts:0,welcome:true});await expect(chooser(page).locator('h1')).toHaveText('欢迎使用 BiliSofa');
 await expect(page.locator('[data-focus-id=launch-add]')).toBeFocused();await expect(page.locator('[data-focus-id=launch-add]')).toContainText('扫码登录');
 await page.locator('[data-focus-id=launch-guest]').click();await expect(chooser(page)).toHaveCount(0);
 await page.reload();await expect(page.locator('[data-focus-id=nav-home]')).toBeVisible();await page.waitForTimeout(300);await expect(chooser(page)).toHaveCount(0);expect(errors).toEqual([]);
});
test('ADR-099 an expired account says so on its card; choosing it hands over to the existing re-scan recovery (ADR-082)',async({page})=>{
 const errors=await launch(page,{expired:true});const card=page.locator('[data-focus-id=launch-account-bili_101]');await expect(card).toContainText('需要重新扫码');
 await card.click();await expect(chooser(page)).toHaveCount(0);await expect(page.locator('#pages')).toContainText('登录需要更新，请用原账号扫码');await expect(page.locator('[data-focus-id=add-account]')).toBeFocused();expect(errors).toEqual([]);
});
test('0.50.1 the chooser is a full page in the product style, and help shows the latest playback failure line',async({page})=>{
 const errors=await launch(page);await expect(chooser(page)).toBeVisible();const box=await chooser(page).boundingBox();expect(box?.width).toBe(1920);expect(box?.height).toBe(1080);
 await expect(chooser(page).locator('.tv-launch-brand')).toHaveText('B');await expect(chooser(page).locator('.tv-eyebrow')).toContainText('BiliSofa');await expect(page.locator('[data-focus-id=launch-guest] svg')).toHaveCount(1);
 await page.keyboard.press('Escape');await page.locator('[data-focus-id=nav-settings]').click();await page.locator('[data-focus-id=settings-section-help]').click();
 await expect(page.locator('.tv-diagnostic-note')).toHaveText('本次运行没有播放失败记录');expect(errors).toEqual([]);
});


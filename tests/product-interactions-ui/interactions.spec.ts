import {test,expect,type Page} from '@playwright/test';
import {fixture} from './fixture.ts';
import {snapshot} from '../w04-media-ui/fixture.ts';
const open=async(page:Page)=>{if(!await page.locator('[data-focus-id=vod-interactions]').isVisible())await page.getByRole('button',{name:'更多',exact:true}).click();await page.locator('[data-focus-id=vod-interactions]').click();};
const cancel=(page:Page)=>page.locator('[data-focus-id=interaction-cancel]').click();
const confirm=(page:Page)=>page.locator('[data-focus-id=interaction-confirm]').click();
test('U4 reversible module: cancel posts nothing; four exact families each confirm once and reread, while media keeps its owner',async({page})=>{
 const f=await fixture(page);await open(page);await expect(page.getByRole('button',{name:'点赞',exact:true})).toBeEnabled();await expect(page.locator('.interaction-panel')).toBeInViewport();await expect(page.locator('[data-focus-id^=interaction-coin],[data-focus-id^=interaction-triple]')).toHaveCount(0);
 await page.getByRole('button',{name:'点赞',exact:true}).click();await expect(page.locator('[data-focus-id=interaction-cancel]')).toBeFocused();await cancel(page);expect(f.posts()).toHaveLength(0);
 for(const label of ['点赞','取消点赞','关注UP','取消关注UP','加入稍后再看','移出稍后再看','加入收藏夹「合成收藏夹」','移出收藏夹「合成收藏夹」']){
  await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.interaction-confirm')).toContainText('BVA000000000');await confirm(page);await expect(page.locator('.interaction-confirm [role=status]')).toContainText('已回查确认');await expect(page.locator('[data-focus-id=interaction-confirm]')).toBeDisabled();await cancel(page);
 }
 expect(f.posts().map(q=>q.operation)).toEqual([8,8,11,11,10,10,9,9]);expect((await snapshot(page)).opened).toBe(1);expect((await snapshot(page)).state).toBe('PLAYING');await expect(page.locator('.interaction-panel img')).toHaveCount(0);
 await page.screenshot({path:'.local/u4-interactions/actions.png'});await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id=vod-interactions]')).toBeFocused();expect(f.errors).toEqual([]);
});
test('U4 unavailable balance/coin/folder proof does not block healthy like; unread folder cannot be inferred empty',async({page})=>{
 const f=await fixture(page,'balance-invalid');await open(page);await expect(page.locator('.interaction-panel [role=status]')).toContainText('interaction.balance.invalid');await expect(page.getByRole('button',{name:'点赞',exact:true})).toBeEnabled();
 f.mode('coins-invalid');await page.locator('[data-focus-id=interaction-read]').click();await expect(page.locator('.interaction-panel [role=status]')).toContainText('interaction.coins.invalid');await expect(page.getByRole('button',{name:'点赞',exact:true})).toBeEnabled();
 f.mode('folders-invalid');await page.locator('[data-focus-id=interaction-read]').click();await expect(page.locator('.interaction-panel [role=status]')).toContainText('interaction.folders.invalid');await expect(page.locator('.interaction-panel')).toContainText('收藏夹状态未确认');await expect(page.locator('[data-focus-id^=interaction-folder-]')).toHaveCount(0);
 await page.getByRole('button',{name:'点赞',exact:true}).click();await confirm(page);await expect(page.locator('.interaction-confirm [role=status]')).toContainText('已回查确认');await cancel(page);expect(f.posts()).toHaveLength(1);await page.screenshot({path:'.local/u4-interactions/partial.png'});expect(f.errors).toEqual([]);
});
test('U4 failed follow is disabled with an exact reason; directional graph reaches healthy actions and folder actions',async({page})=>{
 const f=await fixture(page,'follow-invalid');await open(page);await expect(page.locator('.interaction-panel [role=status]')).toContainText('interaction.follow.unsupported');await expect(page.locator('[data-focus-id=interaction-follow]')).toBeDisabled();await page.locator('[data-focus-id=interaction-back]').focus();await page.keyboard.press('ArrowDown');await expect(page.locator('[data-focus-id=interaction-like]')).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-focus-id=interaction-watch]')).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.locator('[data-focus-id=interaction-back]')).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-focus-id=interaction-read]')).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-focus-id=interaction-folder-f0]')).toBeFocused();expect(f.posts()).toHaveLength(0);expect(f.errors).toEqual([]);
});
test('U4 unknown outcome never retries; readonly recovery settles exact family and consumed confirm remains disabled',async({page})=>{
 const f=await fixture(page,'rejected');await open(page);await page.getByRole('button',{name:'点赞',exact:true}).click();await confirm(page);await expect(page.locator('.interaction-confirm [role=status]')).toContainText('未确认应用');expect(f.posts()).toHaveLength(1);await expect(page.locator('[data-focus-id=interaction-confirm]')).toBeDisabled();f.mode('normal');await page.locator('[data-focus-id=interaction-query-result]').click();await expect(page.locator('.interaction-confirm [role=status]')).toContainText('未点赞');expect(f.posts()).toHaveLength(1);expect(f.errors).toEqual([]);
});
test('U4 Home cancels an unconfirmed account preview immediately, clears private DOM and stops decoder without POST',async({page})=>{
 const f=await fixture(page);await open(page);await page.getByRole('button',{name:'关注UP',exact:true}).click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#overlays')).toBeEmpty();expect((await snapshot(page)).state).toBe('NONE');expect(f.posts()).toHaveLength(0);expect(f.errors).toEqual([]);
});
test('U4 broken local journal keeps readonly state but locks every submission; authentication failure never becomes partial data',async({page})=>{
 const f=await fixture(page);await page.evaluate(()=>localStorage.setItem('bilisofa.video-interactions.v1','broken'));await open(page);await expect(page.locator('.interaction-panel [role=status]')).toContainText('写操作已锁定');await expect(page.locator('[data-focus-id=interaction-like]')).toBeDisabled();await page.keyboard.press('Escape');f.mode('watch-login');await open(page);await expect(page.locator('.interaction-panel [role=status]')).toContainText('interaction.watch-later.login');await expect(page.locator('[data-focus-id=interaction-like]')).toHaveCount(0);expect(f.posts()).toHaveLength(0);expect(f.errors).toEqual([]);
});

test('U4 Back after dispatch drains the owned worker; a readonly refresh never resends consumed authorization',async({page})=>{
 const f=await fixture(page);await open(page);await page.getByRole('button',{name:'点赞',exact:true}).click();f.mode('hold');await confirm(page);await expect.poll(()=>f.posts().length).toBe(1);await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id=interaction-read]')).toBeEnabled();f.mode('normal');await page.locator('[data-focus-id=interaction-read]').click();await expect(page.getByRole('button',{name:'取消点赞',exact:true})).toBeEnabled();expect(f.posts()).toHaveLength(1);expect(f.errors).toEqual([]);
});
test('U4 automatic source replacement invalidates the old target preview before any account write can dispatch',async({page})=>{
 const f=await fixture(page);await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('button',{name:'连播：关闭',exact:true}).click();await open(page);await page.getByRole('button',{name:'点赞',exact:true}).click();await page.evaluate(()=>(globalThis as unknown as {mediaFixture:{end():void}}).mediaFixture.end());await expect(page.locator('.interaction-panel,.interaction-confirm')).toHaveCount(0);expect(f.posts()).toHaveLength(0);expect(f.errors).toEqual([]);
});

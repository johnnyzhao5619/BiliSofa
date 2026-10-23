import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const native = readFileSync('tests/identity-ui/native-fixture.js','utf8');
async function setup(page: Page, variant = 'normal', save = 'normal') {
  await page.route('**/identity/manifest.json', route => route.fulfill({ contentType:'application/json',body:'{}' }));
  await page.route('**/identity/probe.js', route => route.fulfill({contentType:'text/javascript',body:native.replace('__VARIANT__',variant)}));
  await page.addInitScript(({ save }) => {
    const values = new Map<string,string>(); let writes = 0, reads = 0, removes = 0, exits = 0;
    Object.assign(globalThis, { tizen: {
      keymanager: {
        getData({ name }: {name:string}) { reads++; if (!values.has(name)) throw { name:'NotFoundError' }; return values.get(name); },
        saveData(name:string,raw:string,_password:null,success:()=>void) { writes++; if (save !== 'hold') { values.set(name,raw); success(); } },
        removeData({ name }: {name:string}) { removes++; values.delete(name); },
      }, application: { getCurrentApplication: () => ({ exit() { exits++; } }) },
    }, identityFixture: {
      snapshot: () => ({ writes,reads,removes,exits,stored:values.size,credentialFields:[...new Set([...values.values()].flatMap(raw=>Object.keys(JSON.parse(raw))))].sort(),allSecure:[...values.values()].every(raw=>JSON.parse(raw).cookieLines.trim().split('\n').every((line:string)=>line.split('\t')[3]==='TRUE')),allOwned:[...values.keys()].every(k=>/^bilisofa\.session\.v1\.slot[0-7]$/.test(k)) }),
      expire() { for (const [k,raw] of values) { const v=JSON.parse(raw);v.expiresAt=1;values.set(k,JSON.stringify(v)); } },
    } });
  }, { save });
  await page.goto('/'); await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'添加账号 · 扫码登录'})).toBeEnabled();
}
async function login(page: Page) {
  await page.getByRole('button',{name:'添加账号 · 扫码登录'}).click(); await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true})).toBeVisible({timeout:10000});
}
interface Snapshot { credentialFields:string[];writes:number;reads:number;removes:number;exits:number;stored:number;allSecure:boolean;allOwned:boolean; }
const state = (page: Page) => page.evaluate(() => (globalThis as unknown as { identityFixture:{snapshot():Snapshot} }).identityFixture.snapshot());
test('W02 real account UI uses real Worker protocol, saves only protected slots and verifies before activating', async ({page}) => {
  await setup(page); await login(page); const saved=await state(page); expect(saved.writes).toBe(1);expect(saved.stored).toBe(1);expect(saved.allOwned).toBe(true);expect(saved.allSecure).toBe(true);
  expect(await page.evaluate(()=>Object.keys(localStorage))).toHaveLength(0); await expect(page.locator('img')).toHaveCount(0);
  await page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true}).click(); await expect(page.locator('#pages')).toContainText('当前账号：<img src=x>合成身份'); await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();
});
test('W02 Back cancels pending QR exchange, clears canvas and reenters without saving', async ({page}) => {
  await setup(page,'hold'); await page.getByRole('button',{name:'添加账号 · 扫码登录'}).click();await expect(page.locator('canvas')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();expect((await state(page)).stored).toBe(0);await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'添加账号 · 扫码登录'})).toBeEnabled();
});
test('W02 native close unknown never saves credentials or silently resumes', async ({page}) => {
  await setup(page,'unclosed');await page.getByRole('button',{name:'添加账号 · 扫码登录'}).click();await expect(page.locator('#pages [role=status]')).toContainText('未确认',{timeout:10000});expect((await state(page)).writes).toBe(0);
  await page.keyboard.press('Escape');await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');
});
test('W02 removal requires explicit confirmation and checks the owned protected slot disappears', async ({page}) => {
  await setup(page);await login(page);await page.getByRole('button',{name:'移除 <img src=x>合成身份',exact:true}).click();await expect(page.getByRole('button',{name:'保留账号'})).toBeFocused();await page.keyboard.press('Escape');expect((await state(page)).stored).toBe(1);
  await page.getByRole('button',{name:'移除 <img src=x>合成身份',exact:true}).click();await page.getByRole('button',{name:'确认移除'}).click();await expect(page.locator('#pages [role=status]')).toHaveText('尚未保存账号');expect((await state(page)).stored).toBe(0);
  // ADR-082: explicit removal deletes the account slot and both same-identity renewal banks.
  expect((await state(page)).removes).toBe(3);
});
test('W02 restore rejects expired protected record without opening another native request', async ({page}) => {
  await setup(page);await login(page);await page.evaluate(()=>(globalThis as unknown as {identityFixture:{expire():void}}).identityFixture.expire());await page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true}).click();
  await expect(page.locator('#feedback')).toHaveText('登录已失效，请重新扫码');await expect(page.locator('#pages')).toContainText('当前为游客');
});
test('W02 delayed protected save is unknown, not successful login or automatic QR retry', async ({page}) => {
  await setup(page,'normal','hold');await page.getByRole('button',{name:'添加账号 · 扫码登录'}).click();await expect(page.locator('#pages [role=status]')).toContainText('未确认',{timeout:12000});expect((await state(page)).writes).toBe(1);expect((await state(page)).stored).toBe(0);
  await page.getByRole('button',{name:'添加账号 · 扫码登录'}).click();await expect(page.locator('#pages [role=status]')).toContainText('未确认');expect((await state(page)).writes).toBe(1);
});

test('W02 restore checks the original UID instead of trusting a different logged-in identity', async ({page}) => {
  await setup(page,'mismatch');await login(page);await page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true}).click();
  await expect(page.locator('#feedback')).toHaveText('登录已失效，请重新扫码');await expect(page.locator('#pages')).toContainText('当前为游客');
});
test('W02 visibility owner cancels QR and foreground returns without automatic login', async ({page}) => {
  await setup(page,'hold');await page.getByRole('button',{name:'添加账号 · 扫码登录'}).click();await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#pages')).toBeEmpty();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.getByRole('button',{name:'添加账号 · 扫码登录'})).toBeEnabled();await expect(page.locator('canvas')).toBeHidden();expect((await state(page)).writes).toBe(0);
});

test('W02 remote Back cancels pending identity verification with visible feedback and no private authority', async ({page}) => {
  await setup(page,'hold-verify');await login(page);await page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true}).click();
  await expect(page.locator('#feedback')).toHaveText('正在核对账号身份，按返回可取消');await expect(page.locator('#feedback')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await expect(page.locator('#pages')).toContainText('当前为游客');await expect(page.locator('#feedback')).toHaveText('已切换游客');
});

test('W02 foreground identity revalidation also has a cancellable Back path', async ({page}) => {
  await setup(page);await login(page);await page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true}).click();await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();
  await page.route('**/identity/probe.js',route=>route.fulfill({contentType:'text/javascript',body:native.replace('__VARIANT__','hold-verify')}));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#pages')).toBeEmpty();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#feedback')).toHaveText('正在核对账号身份，按返回可取消');
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await expect(page.locator('#pages')).toContainText('当前为游客');await expect(page.locator('#feedback')).toHaveText('已切换游客');
});
async function details(page:Page){await page.getByRole('button',{name:'管理账号'}).click();await page.getByRole('button',{name:'当前账号详情',exact:true}).click();await expect(page.getByRole('button',{name:'返回账号管理',exact:true})).toBeFocused();}
test('F01 verified details show bounded nav profile without growing protected credential schema or writing ordinary storage',async({page},info)=>{
 await setup(page,'profile');await expect(page.getByRole('button',{name:'当前账号详情',exact:true})).toBeDisabled();await login(page);await page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true}).click();await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await details(page);
 const panel=page.getByRole('dialog',{name:'当前账号详情'});await expect(panel).toContainText('等级：Lv5');await expect(panel).toContainText('会员状态：生效 · 年度大会员');await expect(panel).toContainText('UID：101');await expect(panel.locator('img')).toHaveCount(0);await expect(page.getByRole('button',{name:'返回账号管理',exact:true})).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath('account-details.png')});
 expect((await state(page)).credentialFields).toEqual(['cookieLines','expiresAt','id','name','schema','uid']);expect(await page.evaluate(()=>Object.keys(localStorage))).toHaveLength(0);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'当前账号详情',exact:true})).toBeFocused();expect((await state(page)).writes).toBe(1);
});
test('F01 unavailable nav profile is shown as unprovided rather than fake level zero or active membership',async({page})=>{
 await setup(page,'profile-malformed');await login(page);await page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true}).click();await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await details(page);await expect(page.getByRole('dialog',{name:'当前账号详情'})).toContainText('等级：源端未提供');await expect(page.getByRole('dialog',{name:'当前账号详情'})).toContainText('会员状态：源端未提供');
});
test('F01 Home discards old details and refreshes profile; detached old account entry cannot expose a prior snapshot after guest switch',async({page})=>{
 await setup(page,'profile');await login(page);await page.getByRole('button',{name:'使用 <img src=x>合成身份',exact:true}).click();await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await details(page);
 await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:native.replace('__VARIANT__','profile-inactive')}));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#overlays')).toBeEmpty();await expect(page.locator('#pages')).toBeEmpty();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByRole('button',{name:'当前账号详情',exact:true})).toBeEnabled();await page.getByRole('button',{name:'当前账号详情',exact:true}).click();await expect(page.getByRole('dialog',{name:'当前账号详情'})).toContainText('会员状态：未生效 · 年度大会员');await page.keyboard.press('Escape');
 await page.evaluate(()=>Object.assign(globalThis,{oldDetails:document.querySelector('[data-focus-id=account-details-open]')}));await page.getByRole('button',{name:'使用游客身份'}).click();await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await page.evaluate(()=>(globalThis as unknown as{oldDetails:HTMLButtonElement}).oldDetails.click());await expect(page.locator('#overlays')).toBeEmpty();await expect(page.locator('#pages')).not.toContainText('年度大会员');
});

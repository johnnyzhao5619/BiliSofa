import {test,expect,type Page} from '@playwright/test';import {readFileSync} from 'node:fs';
import {setup,snapshot} from '../w04-media-ui/fixture.ts';
const native=readFileSync('tests/w05-product-ui/comments-native-fixture.js','utf8').replace('/synthetic-comments-api','/synthetic-interaction-api').replace('__CLOSE_DELAY__','0');
const identity=readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
async function fixture(page:Page,mode='normal'){
 let liked=false,followed=false,watchLater=false,coins=0,favorite=false,currentMode=mode;const calls:{operation:number;value:string}[]=[];
 await page.route('**/identity/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:identity}));await page.route('**/video-interactions/probe.js',r=>r.fulfill({contentType:'text/javascript',body:native}));
 await page.route('**/synthetic-interaction-api',async route=>{
  const q=route.request().postDataJSON()as{operation:number;value:string};calls.push(q);const [target,direction,folder]=q.value.split('|');let code=0,status=200;
  if(q.operation>=8){expect(q.value.endsWith('|'+'a'.repeat(32))).toBe(true);const entries=await page.evaluate(()=>JSON.parse(localStorage.getItem('bilisofa.video-interactions.v1')!).entries);expect(entries.at(-1).state).toBe('pending');
   if(currentMode==='coin-fail'&&q.operation===12)status=503;else if(currentMode==='rejected'){code=-352;}else{if(q.operation===8)liked=direction==='1';if(q.operation===9){expect(folder).toBe('456');favorite=direction==='1';}if(q.operation===10)watchLater=direction==='1';if(q.operation===11){expect(target).toBe('202');followed=direction==='1';}if(q.operation===12)coins+=Number(direction);}
   if(currentMode==='hold')await new Promise(r=>setTimeout(r,300));
  }
  const data=q.operation===0?{isLogin:true,mid:currentMode==='identity'?999:101,money:10,wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}:q.operation===1?{bvid:q.value,aid:123,owner:{mid:202,name:'合成UP'},title:'合成视频<img src=x>',copyright:1}:q.operation===4?{like:liked,coin:coins}:q.operation===5?{count:1,list:[{id:456,title:'合成收藏夹',fav_state:favorite?1:0}]}:q.operation===6?{mid:202,attribute:followed?2:0}:q.operation===7?{count:watchLater?1:0,list:watchLater?[{aid:123}]:[]}:{};
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify({code,data})});
 });
 await page.addInitScript(()=>{const secrets=new Map([['bilisofa.session.v1.slot0',JSON.stringify({schema:1,id:'bili_101',uid:'101',name:'合成101',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t'+'a'.repeat(32)+'\n'})]]);Object.assign(globalThis,{tizen:{keymanager:{getData({name}:{name:string}){if(!secrets.has(name))throw{name:'NotFoundError'};return secrets.get(name);},saveData(){throw Error('forbidden');},removeData(){throw Error('forbidden');}}}});});
 const errors=await setup(page,false);
 const privateApi=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','0').replace('__FALLBACK__','off').replace("_vod_import_cookies(){throw Error('guest fixture must remain anonymous');}","_vod_import_cookies(){return 1;}").replace('code:-101,data:{isLogin:false','code:0,data:{isLogin:true,mid:101');await page.route('**/vod-api/probe.js',r=>r.fulfill({contentType:'text/javascript',body:privateApi}));
 await page.getByRole('button',{name:'管理账号'}).click();await page.getByRole('button',{name:'使用 合成101',exact:true}).click();await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();
 await page.getByRole('button',{name:'读取游客热门'}).click();await expect(page.locator('.popular-grid button')).toHaveCount(4);await page.locator('.popular-grid button').first().click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();
 return{calls,errors,mode:(s:string)=>{currentMode=s;},posts:()=>calls.filter(q=>q.operation>=8)};
}
const open=(page:Page)=>page.getByRole('button',{name:'账号互动 / 投币 / 三连',exact:true}).click();
const confirm=(page:Page)=>page.getByRole('button',{name:'确认本次操作一次',exact:true}).click();
const cancel=(page:Page)=>page.locator('[data-focus-id=interaction-cancel]').click();
test('F11 whole reversible module reads, previews and cancels without POST, then independently confirms both directions while media continues',async({page},info)=>{
 const f=await fixture(page);await open(page);await expect(page.getByRole('button',{name:'点赞',exact:true})).toBeEnabled();expect(f.posts()).toHaveLength(0);
 await page.getByRole('button',{name:'点赞',exact:true}).click();await expect(page.getByRole('button',{name:'取消，不提交',exact:true})).toBeFocused();await cancel(page);expect(f.posts()).toHaveLength(0);
 for(const label of ['点赞','取消点赞','关注UP','取消关注UP','加入稍后再看','移出稍后再看','加入收藏夹「合成收藏夹」','移出收藏夹「合成收藏夹」']){
  await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.interaction-confirm')).toContainText('BVA000000000');await confirm(page);await expect(page.locator('.interaction-confirm [role=status]')).toContainText('已回查确认');await expect(page.getByRole('button',{name:'确认本次操作一次'})).toBeDisabled();await cancel(page);
 }
 expect(f.posts().map(q=>q.operation)).toEqual([8,8,11,11,10,10,9,9]);expect((await snapshot(page)).state).toBe('PLAYING');expect((await snapshot(page)).opened).toBe(1);await expect(page.locator('.interaction-panel img')).toHaveCount(0);await page.screenshot({path:info.outputPath('interaction-state.png')});await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'账号互动 / 投币 / 三连',exact:true})).toBeFocused();expect(f.errors).toEqual([]);
});
test('F14 one explicit triple shows exact quantity/folder, journals each step, confirms separate readbacks and cannot replay double confirmation',async({page},info)=>{
 const f=await fixture(page);await open(page);await page.getByRole('button',{name:'三连 · 2币 ·「合成收藏夹」',exact:true}).click();await expect(page.locator('.interaction-confirm')).toContainText('投2币');await expect(page.locator('.interaction-confirm')).toContainText('不能撤销');await page.screenshot({path:info.outputPath('triple-confirm.png')});await confirm(page);await expect(page.locator('.interaction-confirm [role=status]')).toContainText('已回查确认');expect(f.posts().map(q=>q.operation)).toEqual([8,12,9]);expect(f.posts()[1]!.value).toContain('|2|0|');await cancel(page);await expect(page.getByRole('button',{name:'投1币 · 需确认',exact:true})).toBeDisabled();const entries=await page.evaluate(()=>JSON.parse(localStorage.getItem('bilisofa.video-interactions.v1')!).entries);expect(entries.map((e:{state:string})=>e.state)).toEqual(['confirmed','confirmed','confirmed']);expect(JSON.stringify(entries)).not.toContain('合成收藏夹');expect(f.errors).toEqual([]);
});
test('F14 partial triple stops on unknown coin, does not silently favorite or finish later, and cannot unlock on read/reopen',async({page})=>{
 const f=await fixture(page,'coin-fail');await open(page);await page.getByRole('button',{name:'三连 · 1币 ·「合成收藏夹」',exact:true}).click();await confirm(page);await expect(page.locator('.interaction-confirm [role=status]')).toContainText('仅部分操作');expect(f.posts().map(q=>q.operation)).toEqual([8,12]);await cancel(page);await expect(page.getByRole('button',{name:'投1币 · 需确认'})).toBeDisabled();await page.keyboard.press('Escape');f.mode('normal');await open(page);await expect(page.getByRole('button',{name:'投1币 · 需确认'})).toBeDisabled();expect(f.posts()).toHaveLength(2);expect(f.errors).toEqual([]);
});
test('F11 Back during dispatched POST drains closure, read-only recovery cannot replay and parent controls recover',async({page})=>{
 const f=await fixture(page);await open(page);await page.getByRole('button',{name:'点赞',exact:true}).click();f.mode('hold');await confirm(page);await expect.poll(()=>f.posts().length).toBe(1);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'读取实际状态 · 不提交'})).toBeEnabled();f.mode('normal');await page.getByRole('button',{name:'读取实际状态 · 不提交'}).click();await expect(page.getByRole('button',{name:'取消点赞',exact:true})).toBeEnabled();expect(f.posts()).toHaveLength(1);expect(f.errors).toEqual([]);
});
test('F11 Home cancels unconfirmed preview immediately and stops underlying decoder with no POST',async({page})=>{
 const f=await fixture(page);await open(page);await page.getByRole('button',{name:'关注UP',exact:true}).click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(async()=>(await snapshot(page)).state,{timeout:400}).toBe('NONE');await expect(page.locator('#overlays')).toBeEmpty();expect(f.posts()).toHaveLength(0);expect(f.errors).toEqual([]);
});
test('F11 source replacement cancels concrete target preview before any confirmation can dispatch against new media',async({page})=>{
 const f=await fixture(page);await page.getByRole('button',{name:'连播：关闭'}).click();await open(page);await page.getByRole('button',{name:'点赞',exact:true}).click();await page.evaluate(()=>(globalThis as unknown as{mediaFixture:{end():void}}).mediaFixture.end());await expect(page.locator('.interaction-panel,.interaction-confirm')).toHaveCount(0);await expect(page.locator('.vod-panel h2')).toContainText('P2');expect(f.posts()).toHaveLength(0);expect((await snapshot(page)).state).toBe('PLAYING');expect(f.errors).toEqual([]);
});
test('F11 corrupt journal or wrong Nav identity never dispatches despite a visible media decoder',async({page})=>{
 const f=await fixture(page);await page.evaluate(()=>localStorage.setItem('bilisofa.video-interactions.v1','broken'));await open(page);await expect(page.locator('.interaction-panel [role=status]')).toContainText('写操作已锁定');await expect(page.getByRole('button',{name:'点赞',exact:true})).toBeDisabled();await page.keyboard.press('Escape');f.mode('identity');await open(page);await expect(page.locator('.interaction-panel [role=status]')).toContainText('interaction.login');expect(f.posts()).toHaveLength(0);expect((await snapshot(page)).state).toBe('PLAYING');expect(f.errors).toEqual([]);
});

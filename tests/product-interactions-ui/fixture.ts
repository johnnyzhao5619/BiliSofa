import {expect,type Page} from '@playwright/test';import {readFileSync} from 'node:fs';
import {setup} from '../w04-media-ui/fixture.ts';
const native=readFileSync('tests/w05-product-ui/comments-native-fixture.js','utf8').replace('/synthetic-comments-api','/synthetic-interaction-api').replace('__CLOSE_DELAY__','0');
const identity=readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
export async function fixture(page:Page,mode='normal'){
 let liked=false,followed=false,watchLater=false,coins=0,favorite=false,currentMode=mode;const calls:{operation:number;value:string}[]=[];
 await page.route('**/identity/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:identity}));await page.route('**/video-interactions/probe.js',r=>r.fulfill({contentType:'text/javascript',body:native}));
 await page.route('**/synthetic-interaction-api',async route=>{
  const q=route.request().postDataJSON()as{operation:number;value:string};calls.push(q);const [target,direction,folder]=q.value.split('|');let code=0,status=200;
  if(currentMode==='folders-network'&&q.operation===5)status=503;
  if(currentMode==='watch-login'&&q.operation===7)code=-101;
  if(q.operation>=8){expect(q.value.endsWith('|'+'a'.repeat(32))).toBe(true);const entries=await page.evaluate(()=>JSON.parse(localStorage.getItem('bilisofa.video-interactions.v1')!).entries);expect(entries.at(-1).state).toBe('pending');
   if(currentMode==='coin-fail'&&q.operation===12)status=503;else if(currentMode==='rejected'||currentMode==='forbidden'){code=currentMode==='forbidden'?-403:-352;}else{if(q.operation===8)liked=direction==='1';if(q.operation===9){expect(folder).toBe('456');favorite=direction==='1';}if(q.operation===10)watchLater=direction==='1';if(q.operation===11){expect(target).toBe('202');followed=direction==='1';}if(q.operation===12)coins+=Number(direction);}
   if(currentMode==='hold')await new Promise(r=>setTimeout(r,300));
  }
  const data=q.operation===0?{isLogin:true,mid:currentMode==='identity'?999:101,money:currentMode==='balance-invalid'?undefined:10,wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}:q.operation===1?{bvid:q.value,aid:123,owner:{mid:202,name:'合成UP'},title:'合成视频<img src=x>',copyright:1}:q.operation===4?{like:liked,coin:currentMode==='coins-invalid'?undefined:coins}:q.operation===5?{count:1,list:[{id:456,title:'合成收藏夹',fav_state:currentMode==='folders-invalid'?undefined:favorite?1:0}]}:q.operation===6?{...(currentMode==='no-mid'?{}:{mid:currentMode==='zero-mid'&&!followed?0:202}),attribute:currentMode==='follow-invalid'?3:followed?2:0}:q.operation===7?{count:watchLater?1:0,list:watchLater?[{aid:123}]:[]}:{};
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify({code,data})});
 });
 await page.addInitScript(()=>{const secrets=new Map([['bilisofa.session.v1.slot0',JSON.stringify({schema:1,id:'bili_101',uid:'101',name:'合成101',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t'+'a'.repeat(32)+'\n'})]]);Object.assign(globalThis,{tizen:{keymanager:{getData({name}:{name:string}){if(!secrets.has(name))throw{name:'NotFoundError'};return secrets.get(name);},saveData(){throw Error('forbidden');},removeData(){throw Error('forbidden');}}}});});
 const errors=await setup(page,false);
 const privateApi=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','0').replace('__FALLBACK__','off').replace("_vod_import_cookies(){throw Error('guest fixture must remain anonymous');}","_vod_import_cookies(){return 1;}").replace('code:-101,data:{isLogin:false','code:0,data:{isLogin:true,mid:101');await page.route('**/vod-api/probe.js',r=>r.fulfill({contentType:'text/javascript',body:privateApi}));
 await page.locator('[data-focus-id=nav-account]').click();await page.getByRole('button',{name:'使用 合成101',exact:true}).click();await expect(page.locator('[data-focus-id=nav-home]')).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:'热门',exact:true}).click();await page.locator('#pages .tv-stream-grid button').first().click();await page.getByRole('button',{name:'播放',exact:true}).click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();
 return{calls,errors,mode:(s:string)=>{currentMode=s;},posts:()=>calls.filter(q=>q.operation>=8)};
}
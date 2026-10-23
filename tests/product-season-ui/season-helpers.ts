import {expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup} from '../w04-media-ui/fixture.ts';
const identity=readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
const follow=readFileSync('tests/w04-media-ui/pgc-follow-fixture.js','utf8'),catalog=readFileSync('tests/catalog-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
/** Modes: 'offline' fails state reads; 'reject' answers writes with -111; 'stale' accepts writes without changing the state;
 * 'status' answers state reads in the per-user status shape (0.49.1) instead of the season view. */
/** True for every build from 0.50.0 on; only the 0.49.x season builds predate the launch chooser and 国创 default. */
export const launchChooser=()=>!/product-season(-fix)?-app$/.test(process.env.BILISOFA_TEST_ROOT??'dist/product-season-app');
export async function setup(page:Page,signedIn:boolean){
 let followed=true,writes=0,reads=0,mode='normal';
 await page.route('**/identity/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:identity}));
 await page.route('**/catalog/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/catalog/probe.js',r=>r.fulfill({contentType:'text/javascript',body:catalog}));
 await page.route('https://i0.hdslb.com/**',r=>r.fulfill({contentType:'image/png',body:png,headers:{'Access-Control-Allow-Origin':'*'}}));
 await page.route('**/pgc-follow/probe.js',r=>r.fulfill({contentType:'text/javascript',body:follow}));
 await page.route('**/synthetic-pgc-follow',async r=>{
  const {operation,value,uid}=r.request().postDataJSON() as {operation:number;value:string;uid:string};
  if(operation===0)return r.fulfill({json:{code:0,data:{isLogin:true,mid:Number(uid),wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}}});
  if(operation===6)return r.fulfill({json:{code:0,data:{total:1,list:[{season_id:123,title:'合成私人追番',new_ep:{index_show:'更新到6集'},progress:'看到第1集'}]}}});
  if(operation===4){reads++;if(mode==='offline')return r.fulfill({status:503,body:'{}'});if(mode==='status')return r.fulfill({json:{code:0,result:{login:1,follow:followed?1:0,follow_status:followed?2:0,area_limit:0}}});return r.fulfill({json:{code:0,result:{season_id:123,title:'合成番剧详情',user_status:{login:1,follow:followed?1:0,area_limit:0},episodes:[]}}});}
  if(operation===7||operation===8){writes++;expect(value).toBe('123|'+'a'.repeat(32));if(mode==='reject')return r.fulfill({json:{code:-111,message:'csrf'}});if(mode!=='stale')followed=operation===7;return r.fulfill({json:{code:0}});}
  throw Error('fixture.unapproved_follow_operation');
 });
 if(signedIn)await page.addInitScript(()=>{
  const secret=JSON.stringify({schema:1,id:'bili_101',uid:'101',name:'合成账号',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t'+'a'.repeat(32)+'\n.bilibili.com\tTRUE\t/\tTRUE\t0\tDedeUserID\t101\n'});
  Object.assign(globalThis,{tizen:{keymanager:{getData({name}:{name:string}){if(name!=='bilisofa.session.v1.slot0')throw {name:'NotFoundError'};return secret;},saveData(){throw Error('fixture.save_forbidden');},removeData(){throw Error('fixture.remove_forbidden');}}}});
 });
 const errors=await mediaSetup(page,false);
 let season=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','1');
 if(signedIn)season=season.replace("_vod_import_cookies(){throw Error('guest fixture must remain anonymous');}","_vod_import_cookies(){return 1;}").replace("code:-101,data:{isLogin:false","code:0,data:{isLogin:true,mid:101").replace('login:0,area_limit:0,follow:0','login:1,area_limit:0,follow:1');
 await page.route('**/pgc-read/probe.js',r=>r.fulfill({contentType:'text/javascript',body:season}));
 // From 0.50.0 builds ask who is watching at launch; the 0.49.x builds select the account on the account page.
 if(signedIn&&launchChooser()){await page.locator('[data-focus-id=launch-account-bili_101]').click();await expect(page.locator('.tv-launch')).toHaveCount(0);await expect(page.locator('[data-focus-id=nav-home]')).toHaveAttribute('aria-current','page');}
 else if(signedIn){await page.getByRole('button',{name:'账号',exact:true}).click();await page.getByRole('button',{name:'使用 合成账号',exact:true}).click();await expect(page.locator('[data-focus-id=nav-home]')).toHaveAttribute('aria-current','page');}
 return {errors,writes:()=>writes,reads:()=>reads,mode:(v:string)=>{mode=v;}};
}
export const cards=(page:Page)=>page.locator('.tv-following .tv-library-grid button');

import {type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup} from '../w04-media-ui/fixture.ts';
const native=readFileSync('tests/w05-product-ui/comments-native-fixture.js','utf8');
export const id=(n:number)=>'90000000000000'+String(n).padStart(4,'0');
const row=(n:number,root='0')=>({oid:123,type:1,rpid_str:id(n),root_str:root,member:{uname:`作者${n}`,mid:'not-for-ui',avatar:'https://outside.invalid/avatar'},ctime:1700000000,like:n,rcount:11,content:{message:`评论${n} <img src=x>安全文本\n`+'正文'.repeat(300)},invisible:false});
export async function comments(page:Page,variant:'normal'|'closed'|'empty'|'refused'|'slow'='normal'){
 const calls:{operation:number;value:string}[]=[];let mode=variant;
 await page.route('**/comments-read/probe.js',route=>route.fulfill({contentType:'text/javascript',body:native.replace('__CLOSE_DELAY__',variant==='slow'?'1000':'0')}));
 await page.route('**/synthetic-comments-api',async route=>{
  const q=route.request().postDataJSON() as {operation:number;value:string};calls.push(q);const fields=q.value.split('|');
  if(mode==='refused'&&q.operation===4){await route.fulfill({status:412,body:'refused'});return;}
  const offset=q.operation===4?JSON.parse(decodeURIComponent(fields[2]!)).offset:'';
  const data=q.operation===0?{isLogin:false,wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}:
   q.operation===1?{bvid:q.value,aid:123}:
   q.operation===4?{cursor:{mode:Number(fields[1]),is_end:mode==='empty'||!!offset,pagination_reply:{next_offset:offset?'':'next'}},top_replies:mode==='empty'?[]:[row(1)],replies:mode==='empty'?[]:offset?[row(9),row(10),row(11)]:Array.from({length:9},(_,i)=>row(i+1))}:
   {root:row(1),page:{num:Number(fields[2]),size:10,count:11},replies:Number(fields[2])===1?Array.from({length:10},(_,i)=>row(100+i,fields[1])):[row(110,fields[1])]};
  await route.fulfill({contentType:'application/json',body:JSON.stringify({code:mode==='closed'&&q.operation===4?12002:q.operation===0?-101:0,data})});
 });
 const errors=await setup(page);return{calls,errors,mode:(value:typeof mode)=>{mode=value;}};
}
export const open=(page:Page)=>page.getByRole('button',{name:'评论 / 回复 · 只读',exact:true}).click();

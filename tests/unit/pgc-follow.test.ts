import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePgcFollowBody} from '../../packages/bili-client/src/pgc-follow.ts';
import {parsePgcFollowCommand,parsePgcFollowPage,parsePgcFollowResult} from '../../packages/contracts/src/pgc-follow.ts';
const row=(id:number)=>({season_id:id,title:'<img src=x>合成标题',new_ep:{index_show:'更新到第2集'},progress:'看到第1集',cover:'https://private.invalid/',user_status:{private:'never-public'}});
test('F17 private list becomes a four-card public DTO with exact category/page and safe text only',()=>{
 const page=parsePgcFollowBody(JSON.stringify({code:0,data:{total:5,list:[1,2,3,4].map(row)}}),{type:2,page:1});
 assert.equal(page.noMore,false);assert.equal(page.type,2);assert.equal(page.items[0]!.seasonId,'1');assert.ok(!JSON.stringify(page).includes('https://'));assert.ok(!JSON.stringify(page).includes('user_status'));assert.deepEqual(parsePgcFollowPage(page),page);
});
test('F17 short and empty pages disable next even if remote total was changed concurrently',()=>{
 for(const list of [[],[row(1),row(2),row(3)]])assert.equal(parsePgcFollowBody(JSON.stringify({code:0,data:{total:10,list}}),{type:1,page:1}).noMore,true);
 assert.equal(parsePgcFollowBody(JSON.stringify({code:0,data:{total:4,list:[1,2,3,4].map(row)}}),{type:1,page:1}).noMore,true);
});
test('F17 list rejects all-unusable rows, excessive data, wrong envelopes and API failures; single bad rows are skipped',()=>{
 for(const data of [{total:1,list:[{...row(1),season_id:0}]},{total:5,list:[1,2,3,4,5].map(row)},{total:-1,list:[]},{total:1,list:[{...row(1),title:''}]}])assert.throws(()=>parsePgcFollowBody(JSON.stringify({code:0,data}),{type:1,page:1}));
 // ADR-111: a repeated or unreadable season is skipped and counted; it still counts toward a full page of four.
 const loose=parsePgcFollowBody(JSON.stringify({code:0,data:{total:9,list:[row(1),row(1),{...row(3),title:''},row(4)]}}),{type:1,page:1});
 assert.deepEqual(loose.items.map(e=>e.seasonId),['1','4']);assert.equal(loose.skipped,2);assert.equal(loose.noMore,false);assert.deepEqual(parsePgcFollowPage(loose),loose);
 assert.throws(()=>parsePgcFollowPage({...loose,skipped:1}));
 assert.throws(()=>parsePgcFollowBody('{"code":-101}',{type:1,page:1}),{code:'login'});assert.throws(()=>parsePgcFollowBody('{"code":-403}',{type:1,page:1}),{code:'permission'});assert.throws(()=>parsePgcFollowBody(' '.repeat(4194305),{type:1,page:1}));
});
test('F17 commands/results never admit arbitrary URLs, CSRF, caller UIDs or unacknowledged cleanup',()=>{
 for(const value of [{kind:'list',query:{type:1,page:1,uid:'202'}},{kind:'state',seasonId:'https://outside.invalid'},{kind:'write',seasonId:'123',follow:1},{kind:'write',seasonId:'123',follow:true,csrf:'private'}])assert.throws(()=>parsePgcFollowCommand(value));
 const result={version:1,operation:'pgc-follow',scope:{accountId:'bili_101',generation:1,requestId:'r1',mediaSessionId:'none'},closed:true,kind:'ok',value:{kind:'state',followed:'no'}};
 assert.equal(parsePgcFollowResult(result).closed,true);assert.throws(()=>parsePgcFollowResult({...result,closed:false}));assert.throws(()=>parsePgcFollowResult({...result,value:{kind:'state',followed:'no',cookie:'private'}}));
});

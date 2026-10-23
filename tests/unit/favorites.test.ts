import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseFavoriteRequest,parseFavoriteResult,parseFavoriteFoldersQuery,parseFavoriteItemsQuery,type FavoriteRequest} from '../../packages/contracts/src/favorites.ts';
import {parseFavoriteFoldersBody,parseFavoriteItemsBody} from '../../packages/bili-client/src/favorites.ts';
import {accountRuntime} from '../../apps/tv/src/platform/account-runtime.ts';
const account={schema:1 as const,id:'bili_123',uid:'123',name:'合成账号',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic\n'},scope={accountId:account.id,generation:1,mediaSessionId:'none',requestId:'fav1'};
const folderBody=(count=6)=>JSON.stringify({code:0,data:[{mediaListResponse:{count,list:Array.from({length:5},(_,i)=>({id:700+i,title:'合成夹'+i,media_count:8,cover:'https://outside.invalid/'}))}},{mediaListResponse:{count:99,list:[]}}]});
const itemsBody=()=>JSON.stringify({code:0,data:{total_count:9,has_more:1,media_list:[{id:10,bv_id:'not-exported',title:'合成视频',type:2,attr:999,pages:[{id:20,page:1,duration:10}],cover:'https://outside.invalid/'},{title:'合成番剧',type:42,pages:[]},{title:'合成课程',type:25,pages:null},{title:'其他',type:77}]}});
test('F05 favorite IPC admits only owned account and bounded folder/page inputs, response must close without secret extras',()=>{
 const q={version:1,operation:'favorite-items-read',scope,account,folderId:'700',query:{folderKey:'f1_0',page:1}};assert.equal(parseFavoriteRequest(q).operation,'favorite-items-read');
 for(const bad of [{...q,folderId:'1&url=x'},{...q,folderId:9007199254740992},{...q,scope:{...scope,accountId:'bili_456'}},{...q,query:{folderKey:'700',page:1}},{...q,url:'outside'}])assert.throws(()=>parseFavoriteRequest(bad));
 for(const query of [{page:0},{page:26},{page:2,refresh:true},{page:1,folderId:123}])assert.throws(()=>parseFavoriteFoldersQuery(query));assert.throws(()=>parseFavoriteItemsQuery({page:1,folderKey:'f1_0',folderId:'700'}));
 const result={version:1,operation:'favorite-folders-read',scope,closed:true,kind:'ok',batch:parseFavoriteFoldersBody(folderBody())};assert.equal(parseFavoriteResult(result).kind,'ok');for(const bad of [{...result,closed:false},{...result,account},{...result,batch:{...result.batch,url:'outside'}}])assert.throws(()=>parseFavoriteResult(bad));
});
test('F05 favorite navigation count is independent of watch-later; duplicates/unsafe IDs/schema refuse instead of inventing completeness',()=>{
 const batch=parseFavoriteFoldersBody(folderBody());assert.equal(batch.items.length,5);assert.equal(batch.total,6);assert.equal(batch.items[0]!.id,'700');assert.doesNotMatch(JSON.stringify(batch),/outside|cover/);
 for(const raw of ['x',' '.repeat(524289),folderBody(4),'{"code":0,"data":[]}',JSON.stringify({code:0,data:[{mediaListResponse:{count:2,list:[{id:7,title:'x',media_count:1},{id:7,title:'x',media_count:1}]}}]})])assert.throws(()=>parseFavoriteFoldersBody(raw));assert.throws(()=>parseFavoriteFoldersBody('{"code":-101}'),{code:'login'});
});
test('F05 favorite items normalize read-only title/type/provided-parts without claiming attr availability or leaking resource IDs',()=>{
 const query={folderKey:'f1_0',page:1},page=parseFavoriteItemsBody(itemsBody(),query);assert.deepEqual(page.items.map(i=>i.kind),['ugc','pgc','course','unknown']);assert.equal(page.items[0]!.providedParts,1);assert.equal(page.noMore,false);assert.doesNotMatch(JSON.stringify(page),/not-exported|outside|attr|bv_id/);
 for(const data of [{total_count:0,has_more:true,media_list:[]},{total_count:0,has_more:'yes',media_list:[]},{total_count:9,has_more:false,media_list:Array(5).fill({title:'x',type:2})}])assert.throws(()=>parseFavoriteItemsBody(JSON.stringify({code:0,data}),query));
});
test('F05 favorite folders snapshot yields private handles; content cannot use stale, wrong-account or unlisted folder refs',async()=>{
 const original=globalThis.Worker,requests:FavoriteRequest[]=[];
 class FakeWorker{onmessage:((e:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;constructor(_file:string){}postMessage(q:FavoriteRequest){requests.push(q);queueMicrotask(()=>this.onmessage?.({data:q.operation==='favorite-folders-read'?{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'ok',batch:parseFavoriteFoldersBody(folderBody())}:{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'ok',page:parseFavoriteItemsBody(itemsBody(),q.query)}}));}terminate(){}}
 globalThis.Worker=FakeWorker as unknown as typeof Worker;
 try{const runtime=accountRuntime(account),signal=new AbortController().signal;
  await assert.rejects(runtime.readFavoriteItems!({folderKey:'f1_0',page:1},scope,signal),{code:'invalid'});const first=await runtime.readFavoriteFolders!({page:1},scope,signal);assert.equal(first.complete,false);assert.equal(first.items.length,4);assert.doesNotMatch(JSON.stringify(first),/700|folderId/);const key=first.items[0]!.key;first.items[0]!.title='mutation';assert.equal((await runtime.readFavoriteFolders!({page:2},scope,signal)).items.length,1);assert.equal(requests.length,1);assert.equal((await runtime.readFavoriteFolders!({page:1},scope,signal)).items[0]!.title,'合成夹0');
  await runtime.readFavoriteItems!({folderKey:key,page:1},scope,signal);assert.equal(requests.length,2);assert.equal((requests[1] as Extract<FavoriteRequest,{operation:'favorite-items-read'}>).folderId,'700');await assert.rejects(runtime.readFavoriteItems!({folderKey:key,page:1},{...scope,accountId:'bili_456'},signal),{code:'invalid'});await assert.rejects(runtime.readFavoriteItems!({folderKey:'f1_99',page:1},scope,signal),{code:'invalid'});
  await runtime.readFavoriteFolders!({page:1,refresh:true},scope,signal);await assert.rejects(runtime.readFavoriteItems!({folderKey:key,page:1},scope,signal),{code:'invalid'});await runtime.close();await assert.rejects(runtime.readFavoriteFolders!({page:1},scope,signal),{code:'cancelled'});
 }finally{globalThis.Worker=original;}
});
test('F05 favorite total closes 3-item and final 2-item pages even when has_more remains true; a short nonfinal page stays navigable',()=>{
 const query={folderKey:'f1_0',page:1},raw=(total:number,count:number,more:boolean)=>JSON.stringify({code:0,data:{total_count:total,has_more:more,media_list:Array.from({length:count},()=>({title:'合成内容',type:2,pages:[]}))}});
 assert.equal(parseFavoriteItemsBody(raw(3,3,true),query).noMore,true);
 assert.equal(parseFavoriteItemsBody(raw(6,4,true),query).noMore,false);
 assert.equal(parseFavoriteItemsBody(raw(6,2,true),{...query,page:2}).noMore,true);
 assert.equal(parseFavoriteItemsBody(raw(9,3,true),query).noMore,false);
 assert.equal(parseFavoriteItemsBody(raw(9,4,false),query).noMore,true);
});
test('F05 favorite null media_list is accepted only for a proven empty terminal page; malformed nonterminal payloads still fail',()=>{
 const query={folderKey:'f1_0',page:2},raw=(total:number,more:unknown,list:unknown)=>JSON.stringify({code:0,data:{total_count:total,has_more:more,media_list:list}});
 assert.deepEqual(parseFavoriteItemsBody(raw(3,false,null),query),{...query,items:[],total:3,noMore:true});
 assert.equal(parseFavoriteItemsBody(raw(0,false,null),{...query,page:1}).noMore,true);
 for(const value of [raw(9,false,null),raw(3,true,null),raw(3,false,{}),raw(3,'false',null),raw(3.5,false,null)])assert.throws(()=>parseFavoriteItemsBody(value,query));
});

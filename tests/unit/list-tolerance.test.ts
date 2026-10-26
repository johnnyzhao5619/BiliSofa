import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DomainError} from '../../packages/contracts/src/index.ts';
import {clockSeconds,eachRow,line,seconds} from '../../packages/bili-client/src/list-rows.ts';
import {parseRecommendationBody,RecommendationWindow} from '../../packages/bili-client/src/recommendations.ts';
import {parseRecommendationResult} from '../../packages/contracts/src/recommendations.ts';
import {parseFavoriteItemsBody} from '../../packages/bili-client/src/favorites.ts';
import {parseFollowUpdatesBody} from '../../packages/bili-client/src/follow-updates.ts';
import {parseUpArchivesBody} from '../../packages/bili-client/src/ranking.ts';
import {noteListSkips,onListSkips} from '../../apps/tv/src/platform/list-skips.ts';
import {durationText} from '../../apps/tv/src/ui/content-card.ts';
const video=(i:number,duration:unknown=183)=>({goto:'av',id:i,bvid:'BV'+String(i).padStart(10,'0'),title:'合成'+i,owner:{name:'合成UP'},duration,rcmd_reason:{content:'合成推荐'}});
const feed=(item:unknown[])=>JSON.stringify({code:0,data:{mid:123,item}});

test('ADR-111 row tool: bad or empty rows are skipped and counted, an all-bad list stays invalid, other errors pass through',()=>{
 assert.deepEqual(eachRow([1,2,3],n=>{if(n===2)throw new DomainError('invalid');return n===3?undefined:n;}),{items:[1],skipped:2});
 assert.deepEqual(eachRow([],()=>1),{items:[],skipped:0});
 assert.throws(()=>eachRow([1,2],()=>{throw new DomainError('invalid');}),{code:'invalid'});
 assert.throws(()=>eachRow([1],()=>{throw new TypeError('bug');}),TypeError);
 assert.deepEqual([seconds(183),seconds(0),seconds(86400),seconds(86401),seconds(166242),seconds(1.5),seconds(-1),seconds('80')],[183,0,86400,0,0,0,0,0]);
 assert.deepEqual([clockSeconds('5:8'),clockSeconds('1440:0'),clockSeconds('1440:1'),clockSeconds('1:99'),clockSeconds(308)],[308,86400,0,0,0]);
 assert.deepEqual([line(' 换\n行\t ',120),line('字'.repeat(130),120).length,line(7,10),line(null,10)],['换 行',120,'','']);
});

test('ADR-111 recommendation regression: a 46-hour video no longer fails the batch; it shows with an unknown duration',()=>{
 const batch=parseRecommendationBody(feed([video(1),video(2,166242),video(3)]),'123');
 assert.deepEqual(batch.items.map(c=>c.durationSeconds),[183,0,183]);assert.equal(batch.skipped,undefined);
 const scope={accountId:'bili_123',generation:1,mediaSessionId:'recommend',requestId:'r1'};
 assert.deepEqual(parseRecommendationResult({version:1,operation:'recommendations-read',scope,closed:true,kind:'ok',batch}).kind,'ok');
});

test('ADR-111 recommendation: malformed, repeated or non-object video cards are skipped and counted apart from non-video cards',()=>{
 const batch=parseRecommendationBody(feed([video(1),{...video(2),bvid:'outside'},video(1),7,{...video(3),owner:{name:''}},{goto:'ad',id:9},video(4)]),'123');
 assert.deepEqual(batch.items.map(c=>c.bvid),['BV0000000001','BV0000000004']);assert.equal(batch.skipped,4);assert.equal(batch.omitted,1);assert.equal(batch.sourceCount,7);
 const w=new RecommendationWindow();w.append(batch);assert.equal(w.page(1).items.length,2);
 const scope={accountId:'bili_123',generation:1,mediaSessionId:'recommend',requestId:'r1'},ok={version:1,operation:'recommendations-read',scope,closed:true,kind:'ok'};
 assert.equal(parseRecommendationResult({...ok,batch}).kind,'ok');
 for(const skipped of [0,6,1.5])assert.throws(()=>parseRecommendationResult({...ok,batch:{...batch,skipped}}));
 assert.throws(()=>parseRecommendationBody(feed([{...video(1),bvid:'x'},{...video(2),title:''}]),'123'),{code:'invalid'});
 assert.throws(()=>new RecommendationWindow().append(parseRecommendationBody(feed([{...video(1),bvid:'x'},{goto:'ad',id:9}]),'123')),{detail:'recommend.no_video'});
});

test('ADR-111 favorites and follow updates: a bad row is skipped and counted; paging still counts source rows',()=>{
 const item=(i:number)=>({type:2,bv_id:'BV'+String(i).padStart(10,'0'),title:'合成收藏'+i,cover:'https://i0.hdslb.com/bfs/archive/a.jpg',pages:[{}]});
 const fav=(list:unknown[],more:boolean,total:number)=>JSON.stringify({code:0,data:{total_count:total,has_more:more,media_list:list}});
 const page=parseFavoriteItemsBody(fav([item(1),7,item(3),item(4)],true,8),{folderKey:'f1_0',page:1});
 assert.equal(page.items.length,3);assert.equal(page.skipped,1);assert.equal(page.noMore,false);
 assert.equal(parseFavoriteItemsBody(fav([item(5),7,item(7),item(8)],false,8),{folderKey:'f1_0',page:2}).noMore,true);
 assert.throws(()=>parseFavoriteItemsBody(fav([7,8],false,2),{folderKey:'f1_0',page:1}));
 const update=(t:unknown)=>({title:'合成动态',author:{name:'合成作者'},pub_time:'1小时前',type:t});
 const batch=parseFollowUpdatesBody(JSON.stringify({code:0,data:{has_more:false,items:[update(8),update('8'),update(64)]}}),'');
 assert.deepEqual(batch.items.map(u=>u.kind),['video','article']);assert.equal(batch.skipped,1);
});

test('ADR-111 UP archives keep skipping unusable rows, now counted, and an all-unusable page is invalid',()=>{
 const row=(i:number)=>({bvid:'BV'+String(i).padStart(10,'0'),title:'合成投稿',duration:166242,stat:{view:1}});
 const p=parseUpArchivesBody(JSON.stringify({code:0,data:{archives:[row(1),row(1),{bvid:'x'}],page:{total:3}}}));
 assert.deepEqual(p.archives.map(a=>a.durationSec),[0]);assert.equal(p.skipped,2);
 assert.throws(()=>parseUpArchivesBody(JSON.stringify({code:0,data:{archives:[{bvid:'x'}],page:{total:1}}})));
});

test('ADR-111 diagnostics hear about skipped rows wherever a result carries them, never about clean results',()=>{
 let heard=0;onListSkips(()=>{heard++;});
 for(const clean of [undefined,null,{},{skipped:0},{page:{skipped:-1}},{batch:{skipped:'2'}},{skipped:1.5}])noteListSkips(clean);
 assert.equal(heard,0);
 for(const skipped of [{skipped:1},{page:{skipped:2}},{batch:{skipped:3}},{value:{page:{skipped:1}}}])noteListSkips(skipped);
 assert.equal(heard,4);onListSkips(()=>{});
});

test('ADR-111 an unknown (0) duration shows nothing; a real one keeps the clock format',()=>{
 assert.deepEqual([durationText(0),durationText(183),durationText(86400)],['','3:03','1440:00']);
});

import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseWatchLaterBody} from '../../packages/bili-client/src/watch-later.ts';
import {parseHistoryBody} from '../../packages/bili-client/src/history.ts';
import {parseFavoriteItemsBody} from '../../packages/bili-client/src/favorites.ts';
import {parseWatchLaterPage} from '../../packages/contracts/src/watch-later.ts';
import {parseHistoryCard} from '../../packages/contracts/src/history.ts';
import {parseFavoriteItemsPage} from '../../packages/contracts/src/favorites.ts';
const bv='BV0000000001',other='BV0000000002';
test('F05 list normalizers retain only the current official UGC public BV fields, without URL/aid fallbacks',()=>{
 const watch=parseWatchLaterBody(JSON.stringify({code:0,data:{count:3,has_more:false,list:[{is_pgc:0,bvid:bv,arc_info:{title:'普通',state:0}},{is_pgc:1,bvid:other,arc_info:{title:'番剧',state:0}},{is_pgc:0,bvid:'https://outside.invalid/',arc_info:{title:'无BV',state:0}}]}}),1);
 assert.equal(watch.items[0]!.bvid,bv);assert.equal(watch.items[1]!.bvid,undefined);assert.equal(watch.items[2]!.bvid,undefined);
 const history=parseHistoryBody(JSON.stringify({code:0,data:{list:[{title:'合成',view_at:1,progress:10,duration:80,history:{business:'archive',bvid:bv,page:2}}],cursor:{max:1,view_at:1,business:'archive'}}}),{max:'0',viewAtSec:0,business:''});assert.equal(history.items[0]!.bvid,bv);assert.equal(history.items[0]!.part,2);
 const fav=parseFavoriteItemsBody(JSON.stringify({code:0,data:{total_count:3,has_more:false,media_list:[{type:2,title:'普通',bv_id:bv},{type:42,title:'番剧',bv_id:other},{type:2,title:'无BV',id:123,bvid:bv,uri:'https://outside.invalid/'}]}}),{folderKey:'f1_0',page:1});
 assert.equal(fav.items[0]!.bvid,bv);assert.equal(fav.items[1]!.bvid,undefined);assert.equal(fav.items[2]!.bvid,undefined);assert.doesNotMatch(JSON.stringify([watch,history,fav]),/outside|uri|oid/);
});
test('F05 private display contracts reject malformed public identities, non-UGC identity and extra remote fields',()=>{
 const w={title:'合成',kind:'ugc',availability:'available',partCount:1},h={title:'合成',kind:'ugc',viewedAtSec:1,progressSec:10,durationSec:80,part:1},f={title:'合成',kind:'ugc',providedParts:1};
 for(const bvid of ['bad','https://outside.invalid/',123]){assert.throws(()=>parseWatchLaterPage({page:1,items:[{...w,bvid}],total:1,noMore:true}));assert.throws(()=>parseHistoryCard({...h,bvid}));assert.throws(()=>parseFavoriteItemsPage({folderKey:'f1_0',page:1,items:[{...f,bvid}],total:1,noMore:true}));}
 for(const card of [{...h,kind:'live',bvid:bv},{...h,bvid:bv,url:'outside'},{...h,bvid:undefined}])assert.throws(()=>parseHistoryCard(card));
 assert.equal(parseHistoryCard({...h,bvid:bv}).bvid,bv);assert.equal(parseWatchLaterPage({page:1,items:[w],total:1,noMore:true}).items[0]!.bvid,undefined);
});

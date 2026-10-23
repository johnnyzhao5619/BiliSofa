import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseLiveRecommendations,parseLiveAreaBody,parseLiveAreaRooms,parseLiveFollowing,parseLiveSource,parseLiveHistory} from '../../packages/bili-client/src/live-product.ts';
import {parseLiveBrowse,parseLiveCatalog,parseLiveMessages} from '../../packages/contracts/src/live-product.ts';
import type {VodCapabilities} from '../../packages/contracts/src/vod-catalog.ts';
const caps:VodCapabilities={video:['avc'],audio:['aac'],qualities:[16,32,64],maxWidth:1280,maxHeight:720,maxFps:30,rates:[1,2]},id='a'.repeat(32);
const card=(n:number)=>({roomid:n,title:'<img src=x>直播标题',uname:'合成主播',area_v2_name:'音乐',cover:'https://never-displayed.invalid/',uid:999});
function source(){return {code:0,data:{room_id:123,short_id:6,live_status:1,is_hidden:false,is_locked:false,encrypted:false,hidden_till:0,lock_till:0,playurl_info:{playurl:{g_qn_desc:[{qn:250,desc:'超清'},{qn:10000,desc:'原画'}],stream:[{protocol_name:'http_hls',format:[{format_name:'ts',codec:[{codec_name:'avc',drm:false,hdr_type:0,dolby_type:0,current_qn:250,accept_qn:[10000,250],video_codecs:{base:'avc1.4d401f'},audio_codecs:{base:'mp4a.40.2'},media_info:{width:1280,height:720},base_url:'/stream/live.m3u8?base=one',url_info:[{host:'https://live-fixture.bilivideo.com',extra:'signature=synthetic'}]}]}]}]}}}};}
test('F18 recommendations use the public homepage source batch and release no image/UID/ad callbacks',()=>{
  const result=parseLiveRecommendations(JSON.stringify({code:0,data:{room_list:[{module_info:{type:6},list:Array.from({length:10},(_,i)=>card(i+1))}],recommend_room_list:[card(99)]}}));assert.equal(result.items.length,10);assert.equal(result.noMore,true);assert.equal(result.items[0]!.title,'<img src=x>直播标题');assert.ok(!JSON.stringify(result).includes('https://'));assert.ok(!JSON.stringify(result).includes('uid'));
});
test('F18 area parents/children are bound and bounded; unavailable source batches are errors, not fabricated empty lists',()=>{
  const raw={code:0,data:[{id:1,name:'娱乐',list:[{id:21,parent_id:1,name:'音乐'}]}]};assert.equal(parseLiveAreaBody(JSON.stringify(raw))[0]!.children[0]!.id,'21');raw.data[0]!.list[0]!.parent_id=2;assert.throws(()=>parseLiveAreaBody(JSON.stringify(raw)));
  assert.throws(()=>parseLiveAreaRooms('{"code":-352}'),error=>(error as {apiCode?:number}).apiCode===-352);
  assert.throws(()=>parseLiveAreaRooms('{"code":0,"data":{"list":[],"has_more":1}}'));assert.equal(parseLiveAreaRooms('{"code":0,"data":{"list":[],"has_more":0}}').noMore,true);
});
test('F18 following batches preserve source page size and offline/no-room entries without pretending four-card remote pagination',()=>{
  const rows=Array.from({length:9},(_,i)=>({...card(i+1),live_status:i===0?0:1}));const result=parseLiveFollowing(JSON.stringify({code:0,data:{list:rows,totalPage:2}}),1);assert.equal(result.items.length,9);assert.equal(result.noMore,false);assert.equal(result.items[0]!.state,'offline');
  const emptyRoom=parseLiveFollowing(JSON.stringify({code:0,data:{list:[{roomid:0,uname:'尚未开播',title:'',live_status:0}],totalPage:1}}),1);assert.equal(emptyRoom.items[0]!.roomId,undefined);assert.equal(emptyRoom.noMore,true);
  assert.throws(()=>parseLiveFollowing('{"code":-101}',1),{code:'login'});
});
test('F18 query contracts reject caller URLs, identities, invented parameters and overflows',()=>{
  for(const query of [{kind:'following',page:0},{kind:'following',page:1,uid:'202'},{kind:'area',parentId:'1',areaId:'https://outside.invalid',page:1},{kind:'recommend',page:2},{kind:'area',parentId:'9007199254740992',areaId:'0',page:1}])assert.throws(()=>parseLiveBrowse(query));
});
test('F18 source records actual returned qn and codec/dimensions, not the requested label; canonical room binding is mandatory',()=>{
  const result=parseLiveSource(JSON.stringify(source()),{roomId:'123',qn:80},id,caps);assert.equal(result.summary.selectedQn,250);assert.equal(result.summary.width,1280);assert.equal(result.summary.qualities.length,2);assert.match(result.url!,/^https:\/\/live-fixture\.bilivideo\.com\/stream\/live\.m3u8\?base=one&signature=/);assert.ok(!JSON.stringify(result.summary).includes('signature'));assert.deepEqual(parseLiveCatalog(result.summary),result.summary);
  assert.throws(()=>parseLiveSource(JSON.stringify(source()),{roomId:'6',qn:80},id,caps),{code:'invalid'});
});
test('F18 source rights, HDR/DRM, unsupported size/audio and unsafe endpoints never enter a playable catalog',()=>{
  for(const variant of ['hidden','locked','password','drm','hdr','size','audio','host','relative','duplicate-qn']as const){const raw=source(),d=raw.data,c=d.playurl_info.playurl.stream[0]!.format[0]!.codec[0]!;
    if(variant==='hidden')d.is_hidden=true;if(variant==='locked')d.is_locked=true;if(variant==='password')d.encrypted=true;if(variant==='drm')c.drm=true;if(variant==='hdr')c.hdr_type=1;if(variant==='size'){c.media_info.width=99999;c.media_info.height=2160;};if(variant==='audio')c.audio_codecs.base='ec-3';if(variant==='host')c.url_info[0]!.host='https://outside.invalid/';if(variant==='relative')c.base_url='//outside.invalid/live.m3u8';if(variant==='duplicate-qn')c.accept_qn=[250,250];
    assert.throws(()=>parseLiveSource(JSON.stringify(raw),{roomId:'123',qn:0},id,caps),variant);
  }
});
test('F18 offline is distinct from failure and has no transport or invented playable quality',()=>{
  const raw=source();raw.data.live_status=0;const result=parseLiveSource(JSON.stringify(raw),{roomId:'123',qn:0},id,caps);assert.equal(result.summary.state,'offline');assert.equal(result.url,undefined);assert.deepEqual(result.summary.qualities,[]);assert.throws(()=>parseLiveCatalog({...result.summary,selectedQn:250}));
});
test('F18 recent messages are safe text with explicit live wall time, stable hashes and no UID or medal payload',async()=>{
  const row={text:'<script>safe text</script>',nickname:'合成昵称',uid:999,timeline:'2026-10-20 12:34:56',medal:['private']},hash=async(value:string)=>createHash('sha256').update(value).digest('hex').slice(0,32);
  const result=await parseLiveHistory(JSON.stringify({code:0,data:{admin:[],room:[row,row]}}),'123',hash);assert.equal(result.items.length,1);assert.equal(result.items[0]!.atMs,Date.parse('2026-10-20T12:34:56+08:00'));assert.equal(result.items[0]!.body,row.text);assert.ok(!JSON.stringify(result).includes('uid'));assert.ok(!JSON.stringify(result).includes('medal'));assert.deepEqual(parseLiveMessages(result),result);
  await assert.rejects(parseLiveHistory(JSON.stringify({code:0,data:{room:[{...row,timeline:'2026-02-31 12:34:56'}]}}),'123',hash));
  assert.deepEqual((await parseLiveHistory('{"code":0,"data":{"room":[]}}','123',hash)).items,[]);
});
test('F18 1080P/4K actual AVC candidates are parsed without a measured-model envelope or trial flag; invalid dimensions remain bounded',()=>{
 for(const [width,height]of [[1920,1080],[3840,2160],[1600,1280]]){const raw=source(),c=raw.data.playurl_info.playurl.stream[0]!.format[0]!.codec[0]!;c.media_info={width:width!,height:height!};const r=parseLiveSource(JSON.stringify(raw),{roomId:'123',qn:80},id,caps);assert.equal(r.summary.width,width);assert.equal(r.summary.height,height);assert.ok(r.url);assert.deepEqual(parseLiveCatalog(r.summary),r.summary);}
 const raw=source();raw.data.playurl_info.playurl.stream[0]!.format[0]!.codec[0]!.media_info.width=99999;assert.throws(()=>parseLiveSource(JSON.stringify(raw),{roomId:'123',qn:80},id,caps),{code:'invalid'});
});
test('F18 private CDN candidates preserve signed query bytes and separators, deduplicate and never enter a public catalog',()=>{
 const raw=source(),c=raw.data.playurl_info.playurl.stream[0]!.format[0]!.codec[0]!;
 c.base_url='/stream/live.m3u8?';c.url_info=[{host:'https://live-fixture.bilivideo.com',extra:'sig=a%2Fb&qn=250'},{host:'https://fallback.bilivideo.com/',extra:'?sig=a%2Fb&qn=250'},{host:'https://fallback.bilivideo.com/',extra:'&sig=a%2Fb&qn=250'}];
 const result=parseLiveSource(JSON.stringify(raw),{roomId:'123',qn:0},id,caps);assert.match(result.url!,/\.m3u8\?sig=a%2Fb&qn=250$/);assert.equal(result.alternates!.length,1);assert.ok(!JSON.stringify(result.summary).includes('sig='));assert.throws(()=>parseLiveCatalog({...result.summary,alternates:result.alternates}),{code:'invalid'});
 c.url_info[1]!.host='https://outside.invalid';assert.throws(()=>parseLiveSource(JSON.stringify(raw),{roomId:'123',qn:0},id,caps),{code:'invalid'});
});

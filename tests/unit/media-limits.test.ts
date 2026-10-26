import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DomainError} from '../../packages/contracts/src/index.ts';
import {MAX_DANMAKU_SEGMENT,MAX_MEDIA_MS,MAX_MEDIA_SECONDS} from '../../packages/contracts/src/media-limits.ts';
import {mediaLength,parseVodPlayback} from '../../packages/bili-client/src/vod-catalog.ts';
import {parseResumePoint} from '../../packages/contracts/src/local-profile.ts';
import {parseOverlayCommand} from '../../packages/contracts/src/overlay-read.ts';
import {clockTime,spokenLength} from '../../apps/tv/src/ui/content-card.ts';
// ADR-115: media up to seven days plays; longer is an unsupported video, not malformed data.
test('ADR-115 the shared bound is seven days, with 1680 six-minute danmaku segments',()=>{
 assert.equal(MAX_MEDIA_SECONDS,604800);assert.equal(MAX_MEDIA_MS,604800000);assert.equal(MAX_DANMAKU_SEGMENT,1680);
 assert.ok(MAX_MEDIA_MS<2**32,'fits the bridge\'s 32-bit unsigned field');
});
test('ADR-115 a length over seven days is unsupported; a malformed one stays invalid',()=>{
 assert.equal(mediaLength(108000,MAX_MEDIA_SECONDS),108000);assert.equal(mediaLength(604800,MAX_MEDIA_SECONDS),604800);
 assert.throws(()=>mediaLength(604801,MAX_MEDIA_SECONDS),(e:unknown)=>e instanceof DomainError&&e.code==='unsupported');
 for(const bad of [0,1.5,'60',-1,undefined])assert.throws(()=>mediaLength(bad,MAX_MEDIA_SECONDS),(e:unknown)=>e instanceof DomainError&&e.code==='invalid');
});
const at=(name:string)=>`https://upos-sz-mirrorcosov.bilivideo.com/upgcxcode/${name}.m4s?e=x&deadline=1800007200`;
const track=(kind:'video'|'audio')=>({id:kind==='video'?80:30280,mimeType:`${kind}/mp4`,codecs:kind==='video'?'avc1.640028':'mp4a.40.2',bandwidth:kind==='video'?3000000:192000,baseUrl:at(kind),backupUrl:[],
 ...(kind==='video'?{width:1920,height:1080,frameRate:'30000/1001'}:{}),SegmentBase:{Initialization:'0-999',indexRange:'1000-20000'}});
const playurl=(ms:number)=>JSON.stringify({code:0,data:{quality:80,timelength:ms,support_formats:[{quality:80,new_description:'1080P'}],dash:{duration:Math.round(ms/1000),video:[track('video')],audio:[track('audio')]}}});
const part=(ms:number)=>({cid:'202',item:{bvid:'BV0000000001',part:1,title:'合成',durationMs:ms}});
test('ADR-115 a 30-hour playback reads; one over seven days is refused as unsupported',()=>{
 const long=108000000,catalog=parseVodPlayback(playurl(long),part(long),'a'.repeat(32),1800000000000);
 assert.equal(catalog.durationMs,long);assert.equal(catalog.summary.item.durationMs,long);
 assert.throws(()=>parseVodPlayback(playurl(MAX_MEDIA_MS+1000),part(long),'a'.repeat(32),1800000000000),(e:unknown)=>e instanceof DomainError&&e.code==='unsupported');
});
test('ADR-115 a resume point at 26 h of a 30 h video is kept; past seven days it is not',()=>{
 const point={bvid:'BV0000000001',part:1,timeMs:93600000,durationMs:108000000,updatedAt:1800000000000};
 assert.deepEqual(parseResumePoint(point),point);
 assert.throws(()=>parseResumePoint({...point,durationMs:MAX_MEDIA_MS+1}));
});
test('ADR-115 danmaku segment 1680 is the last one asked for',()=>{
 assert.deepEqual(parseOverlayCommand({kind:'danmaku',segment:1680}),{kind:'danmaku',segment:1680});
 assert.throws(()=>parseOverlayCommand({kind:'danmaku',segment:1681}));
});
test('ADR-115 an hour or more reads h:mm:ss; shorter keeps m:ss',()=>{
 assert.deepEqual([0,75,3599,3600,4530,90000,604800].map(clockTime),['0:00','1:15','59:59','1:00:00','1:15:30','25:00:00','168:00:00']);
 assert.deepEqual([75,4530].map(spokenLength),['1分15秒','1小时15分30秒']);
});

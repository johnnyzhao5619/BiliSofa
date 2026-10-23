import {test}from'node:test';import assert from'node:assert/strict';
import{DEFAULT_QUALITY_CEILING,preferredVodChoice,vodPreference}from'../../packages/media/src/vod-track-preference.ts';
import{LocalProfiles}from'../../apps/tv/src/platform/local-profile-store.ts';
import type{VodReadResult}from'../../packages/contracts/src/vod-runtime.ts';
import type{VodCapabilities,VodTrackPreference}from'../../packages/contracts/src/vod-catalog.ts';
const caps:VodCapabilities={video:['avc'],audio:['aac'],qualities:[16,32,64],maxWidth:1280,maxHeight:720,maxFps:30,rates:[1,2]};
const pref:VodTrackPreference={quality:32,videoCodec:'avc',videoBandwidth:1000000,audioCodec:'aac',audioBandwidth:192000};
function result():VodReadResult {return {detail:{title:'合成',owner:'合成',parts:[{bvid:'BV0000000001',part:1,title:'P1',durationMs:8000}]},catalog:{id:'a'.repeat(32),item:{bvid:'BV0000000001',part:1,title:'P1',durationMs:8000},videos:[{key:'v0',quality:16,label:'360P',codec:'avc',width:640,height:360,fps:30,bandwidth:500000},{key:'v1',quality:32,label:'480P',codec:'avc',width:852,height:480,fps:30,bandwidth:1000000},{key:'v2',quality:64,label:'720P',codec:'hevc',width:1280,height:720,fps:30,bandwidth:1000000}],audios:[{key:'a0',label:'AAC64',codec:'aac',bandwidth:64000},{key:'a1',label:'AAC192',codec:'aac',bandwidth:192000}]}};}
test('F06 preferences rebind semantic quality/audio to a new catalog instead of reusing old keys',()=>{
 const r=result(),p=vodPreference(r.catalog,{catalogId:r.catalog.id,videoKey:'v1',audioKey:'a1'});assert.deepEqual(p,pref);r.catalog.id='b'.repeat(32);r.catalog.videos.reverse().forEach((v,i)=>v.key='v'+i);r.catalog.audios.reverse().forEach((a,i)=>a.key='a'+i);
 const selected=preferredVodChoice(r,caps,p);assert.deepEqual(selected,{choice:{catalogId:'b'.repeat(32),videoKey:'v1',audioKey:'a0'},fallback:false});assert.ok(!JSON.stringify(p).includes('catalogId'));
});
test('F06 missing previous video AND audio select the closest actually compatible pair and preserve the original intent',()=>{
 const r=result();r.catalog.videos=[r.catalog.videos[0]!];r.catalog.audios=[r.catalog.audios[0]!];const actual=preferredVodChoice(r,caps,pref);assert.equal(actual.fallback,true);assert.deepEqual(actual.choice,{catalogId:r.catalog.id,videoKey:'v0',audioKey:'a0'});assert.equal(pref.quality,32);assert.equal(pref.audioBandwidth,192000);
 assert.equal(preferredVodChoice(result(),caps,pref).fallback,false);
});
test('F06 unavailable codec, too-large or high-fps sources are excluded; no compatible pair is an honest unsupported result',()=>{
 const r=result();const selected=preferredVodChoice(r,caps,{...pref,quality:64,videoCodec:'hevc'});assert.equal(selected.choice.videoKey,'v1');assert.equal(selected.fallback,true);r.catalog.videos=r.catalog.videos.filter(v=>v.codec==='hevc');assert.throws(()=>preferredVodChoice(r,caps,pref),{code:'unsupported'});
 assert.throws(()=>vodPreference(result().catalog,{catalogId:'b'.repeat(32),videoKey:'v0',audioKey:'a0'}),{code:'invalid'});
});
test('F06 temporary track intent is isolated per identity, survives page facades, clears with that identity and never changes stored schema',()=>{
 const storage=new Map<string,string>(),profiles=new LocalProfiles({getItem:k=>storage.get(k)??null,setItem:(k,v)=>{storage.set(k,v);},removeItem:k=>{storage.delete(k);}});profiles.profile('guest').rememberTracks!(pref);assert.deepEqual(profiles.profile('guest').readTracks!(),pref);assert.equal(profiles.profile('bili_101').readTracks!(),undefined);assert.equal(storage.size,0);
 const copy=profiles.profile('guest').readTracks!()!;copy.quality=16;assert.equal(profiles.profile('guest').readTracks!()!.quality,32);profiles.profile('bili_101').rememberTracks!({...pref,quality:16});profiles.profile('guest').clear();assert.equal(profiles.profile('guest').readTracks!(),undefined);assert.equal(profiles.profile('bili_101').readTracks!()!.quality,16);
 assert.throws(()=>profiles.profile('guest').rememberTracks!({...pref,url:'https://outside.invalid'}as VodTrackPreference),{code:'invalid'});
});
test('F19 first play without a remembered intent picks the best supported AVC up to 1080P, never the lowest track or an unverified 4K/HDR default',()=>{
 const r=result();assert.deepEqual(preferredVodChoice(r,caps).choice,{catalogId:r.catalog.id,videoKey:'v1',audioKey:'a1'});
 const wide:VodCapabilities={...caps,video:['avc','hevc'],qualities:[16,32,64,80,112,120,125],maxWidth:3840,maxHeight:2160,maxFps:60};
 r.catalog.videos.push({key:'v3',quality:80,label:'1080P',codec:'avc',width:1920,height:1080,fps:30,bandwidth:2000000},{key:'v4',quality:112,label:'1080P+',codec:'avc',width:1920,height:1080,fps:30,bandwidth:6000000},{key:'v5',quality:120,label:'4K',codec:'hevc',width:3840,height:2160,fps:30,bandwidth:15000000});
 assert.equal(DEFAULT_QUALITY_CEILING,80);assert.equal(preferredVodChoice(r,wide).choice.videoKey,'v3');
 r.catalog.videos=r.catalog.videos.filter(v=>v.quality>80);assert.equal(preferredVodChoice(r,wide).choice.videoKey,'v4');
});

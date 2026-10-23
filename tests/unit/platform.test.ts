import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticAddress, inspectPlatform } from '../../apps/tv/src/platform/samsung.ts';
test('W01 private display-only address accepts WiFi ON, rejects disconnected/bad addresses and is absent from diagnostics', async () => {
  const target = globalThis as unknown as { tizen?: unknown };
  const previous = target.tizen;
  try {
    target.tizen = { systeminfo: { getPropertyValue: (name: string, success: (value: unknown) => void) => success({ status: name === 'WIFI_NETWORK' ? 'ON' : 'DISCONNECTED', ipAddress: '192.0.2.1' }) } };
    assert.equal(await diagnosticAddress(), '192.0.2.1');
    assert.equal(JSON.stringify(inspectPlatform()).includes('192.0.2.1'), false);
    for (const ipAddress of ['999.1.1.1', '127.0.0.1', '0.0.0.0', '224.0.0.1', '192.0.2.1/path']) {
      target.tizen = { systeminfo: { getPropertyValue: (_name: string, success: (value: unknown) => void) => success({ status: 'ON', ipAddress }) } };
      assert.equal(await diagnosticAddress(), undefined);
    }
  } finally { if (previous === undefined) delete target.tizen; else target.tizen = previous; }
});
test('W04 candidate playback depends on usable SDK, not model or ProductInfo permission; bounds are parser limits, not certification',async()=>{
 const {vodRuntimeStatus,vodCandidateCapabilities}=await import('../../apps/tv/src/platform/samsung.ts');
 const target=globalThis as unknown as {webapis?:unknown},previous=target.webapis;
 const api=Object.fromEntries(['open','getState','setListener','setDisplayRect','prepareAsync','play','pause','seekTo','stop','close'].map(n=>[n,()=>{}]));
 try{
  target.webapis={};assert.deepEqual(vodRuntimeStatus(),{kind:'unavailable',reason:'player_api_missing'});assert.equal(vodCandidateCapabilities(),undefined);
  for(const productinfo of [undefined,{getModel:()=> 'OTHER_MODEL'},{getModel(){throw {name:'SecurityError'};}}]){
   target.webapis={productinfo,avplay:api,appcommon:{setScreenSaver(){},AppCommonScreenSaverState:{SCREEN_SAVER_ON:1,SCREEN_SAVER_OFF:0}}};
   assert.equal(vodRuntimeStatus().kind,'available');const candidates=vodCandidateCapabilities()!;assert.ok(candidates.qualities.includes(80));assert.ok(candidates.video.includes('hevc'));assert.ok(candidates.maxWidth>=3840);
  }
 }finally{if(previous===undefined)delete target.webapis;else target.webapis=previous;}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ApprovedSoapReceiver} from '../../packages/cast/src/receiver.ts';
import {parseReceiverSnapshot} from '../../packages/contracts/src/cast-receiver.ts';
import {parseCastProbeResult} from '../../packages/contracts/src/cast-probe.ts';
import type {SoapRequest} from '../../packages/contracts/src/upnp.ts';
const now=1800000000000,peer='0a000009';
const offer=(part=1,expiry=now+3600000):SoapRequest=>({service:'AVTransport',kind:'offer',action:'SetAVTransportURI',uri:`http://test.bilivideo.com/upgcxcode/a.mp4?deadline=${expiry/1000}&part=${part}`,metadata:''});
const snapshot=(generation=1,frame=1)=>({generation,frame,state:'playing',timeMs:16000,durationMs:240000,seeking:false,controller:'sender'});
const query:SoapRequest={service:'AVTransport',kind:'query',action:'GetPositionInfo'};
const scope={accountId:'guest',generation:0,mediaSessionId:'receiver',requestId:'r1'};
test('W06 current source remains governed by real expiry after five minutes; stale snapshot and foreign sender remain rejected',()=>{
 const r=new ApprovedSoapReceiver(true,true);r.approve(peer,offer(),now);assert.equal(r.update(snapshot(1,100001),now+600000),true);
 const result=r.handle(query,peer,2048,now+600001);assert.ok('reply' in result);assert.equal(result.reply.status,200);assert.match(result.reply.body,/<RelTime>00:00:16/);
 for(const [who,at]of[['0a000008',now+600001],[peer,now+604000],[peer,now+3600000]] as const){const d=r.handle(query,who,2049,at);assert.ok('reply'in d);assert.equal(d.reply.status,500);}
});
test('W06 more than 24 commands and four sources retain one owner, monotonic requests and fresh new signed expiry',()=>{
 const r=new ApprovedSoapReceiver(true,true);r.approve(peer,offer(),now);let frame=0,id=1024;
 for(let g=1;g<=12;g++){
  r.update(snapshot(g,++frame),now+g*100);
  for(let i=0;i<4;i++){const command:SoapRequest={service:'AVTransport',kind:'control',action:i%2?'Play':'Pause'};const d=r.handle(command,peer,++id,now+g*100+1);assert.ok('command'in d);assert.equal(r.acknowledge(id,true,now+g*100+2)?.status,200);}
  if(g<12){const d=r.handle(offer(g+1,now+7200000),peer,++id,now+g*100+3);assert.ok('transition'in d);assert.equal(d.transition?.generation,g+1);}
 }
 assert.equal(r.update(snapshot(12,++frame),now+4000000),true);const d=r.handle(query,peer,++id,now+4000001);assert.ok('reply'in d);assert.equal(d.reply.status,200);
 r.end();assert.equal(r.update(snapshot(12,++frame),now+4000002),false);
});
test('W06 wider scalar protocol is explicit, strict and unavailable to retained W01 probes',()=>{
 assert.throws(()=>parseReceiverSnapshot(snapshot(5,100001)));assert.equal(parseReceiverSnapshot(snapshot(21,100001),true).generation,21);
 for(const code of ['cast.transition_ready_21','cast.media_timeout_isolated_g21','cast.product_offer_owner']){const v={version:1,scope,operation:'cast-discovery',closed:false,code};assert.throws(()=>parseCastProbeResult(v));assert.equal(parseCastProbeResult(v,true).code,code);}
 for(const code of ['cast.transition_ready_2147483647','cast.product_offer_private-uri','cast.transition_ready_01'])assert.throws(()=>parseCastProbeResult({version:1,scope,operation:'cast-discovery',closed:false,code},true));
});

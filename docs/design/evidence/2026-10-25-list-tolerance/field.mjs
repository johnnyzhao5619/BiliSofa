// Finds which recommendation-card field the account kernel Worker rejects. Records only types, lengths,
// control-character codes and format flags of the failing card, never values.
import { writeFileSync } from 'node:fs';
const [port='9333', runs='12', out='field.json'] = process.argv.slice(2);
const page=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let seq=0;const waiting=new Map();const found=[];let sessions=0;
const send=(method,params={},sessionId)=>new Promise(y=>{const id=++seq;waiting.set(id,y);ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
const describe=`JSON.stringify((()=>{const o=typeof v!=='undefined'?v:undefined;if(!o||typeof o!=='object')return {noV:true};const f={};for(const k of Object.keys(o)){const x=o[k];f[k]={type:x===null?'null':typeof x,len:typeof x==='string'?x.length:undefined,ctrl:typeof x==='string'?[...new Set([...x].filter(c=>c.charCodeAt(0)<32).map(c=>c.charCodeAt(0)))]:undefined,num:k==='durationSeconds'&&typeof x==='number'?x:undefined,bvOk:k==='bvid'&&typeof x==='string'?/^BV[A-Za-z0-9]{10}$/.test(x):undefined};}return f;})())`;
ws.onmessage=async e=>{const m=JSON.parse(e.data);if(m.id&&waiting.has(m.id)){waiting.get(m.id)(m);waiting.delete(m.id);return;}
 if(m.method==='Target.attachedToTarget'){const sid=m.params.sessionId;sessions++;await send('Debugger.enable',{},sid);await send('Debugger.setPauseOnExceptions',{state:'all'},sid);await send('Runtime.runIfWaitingForDebugger',{},sid);return;}
 if(m.method==='Debugger.paused'&&m.sessionId){const p=m.params,sid=m.sessionId;const names=p.callFrames.map(f=>f.functionName);
  const at=names.indexOf('parseRecommendationCard');
  if(at>=0){const r=await send('Debugger.evaluateOnCallFrame',{callFrameId:p.callFrames[at].callFrameId,expression:describe,returnByValue:true},sid);
   found.push({exception:(p.data?.description??'').split('\n')[0].slice(0,80),stack:names.slice(0,6),fields:JSON.parse(r.result?.result?.value??'{}')});}
  else if(names.some(n=>/parseRecommendationBody|responded/.test(n))&&/invalid/i.test(p.data?.description??''))found.push({exception:(p.data?.description??'').split('\n')[0].slice(0,80),stack:names.slice(0,6)});
  await send('Debugger.resume',{},sid);}
};
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true});return r.result?.result?.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');
await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
const results=[];
for(let i=0;i<Number(runs);i++){
 const before=found.length;await send('Page.reload',{});const t0=Date.now();let picked=false,outcome=null;
 while(Date.now()-t0<40000){
  if(!picked&&await js(`!!document.querySelector('[data-focus-id^="launch-account-"]')`)){await js(`document.querySelector('[data-focus-id^="launch-account-"]').click()`);picked=true;}
  const v=await js(`JSON.stringify((()=>{const s=document.querySelector('.tv-shelf');if(!s)return null;return {cards:s.querySelectorAll('.tv-card').length,code:s.querySelector('.tv-shelf-status')?.title??''}})())`);
  const o=v&&JSON.parse(v);if(o&&(o.cards||o.code)){outcome=o;break;}await sleep(100);
 }
 results.push({run:i+1,outcome,found:found.slice(before)});console.log(i+1,JSON.stringify(outcome),'workers',sessions,'found',found.length-before);
 if(outcome?.code&&found.length>before)break;
 await sleep(3000);
}
writeFileSync(out,JSON.stringify(results,null,1));ws.close();

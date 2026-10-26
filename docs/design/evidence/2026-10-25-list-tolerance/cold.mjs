// ADR-111: repeated cold-ish starts (page reload, account picked at once) with a Worker probe that keeps only fixed
// result fields (type, operation, kind, code, detail, skipped). Usage: node cold.mjs <port> <runs> <out>.
import { writeFileSync } from 'node:fs';
const [port='9333', runs='8', out='repro.json'] = process.argv.slice(2);
const page=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let seq=0;const waiting=new Map();let exc=[];
const send=(method,params={})=>new Promise(y=>{const id=++seq;waiting.set(id,y);ws.send(JSON.stringify({id,method,params}));});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&waiting.has(m.id)){waiting.get(m.id)(m);waiting.delete(m.id);return;}
 if(m.method==='Debugger.paused'){const p=m.params;const d=(p.data?.description??'').toString();exc.push({d:d.split('\n')[0].slice(0,160),f:p.callFrames.slice(0,4).map(f=>`${f.functionName}@${(f.url||'').split('/').pop()}:${f.location.lineNumber+1}:${f.location.columnNumber+1}`)});send('Debugger.resume');}};
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true});return r.result?.result?.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const probe=`(()=>{const W=window.Worker;window.__k=[];const t0=performance.now();const pick=(o)=>{if(!o||typeof o!=='object')return {};const r=o.result&&typeof o.result==='object'?o.result:undefined;return {type:o.type,op:r?.operation??o.request?.operation,kind:r?.kind,code:r?.code,detail:typeof r?.detail==='string'?r.detail:undefined,apiCode:r?.apiCode,http:r?.http??r?.status,skipped:r?.skipped??r?.batch?.skipped??r?.page?.skipped};};
window.Worker=function(file,opts){const w=new W(file,opts);const name=String(file).split('/').pop();w.addEventListener('message',e=>{try{window.__k.push({t:Math.round(performance.now()-t0),w:name,dir:'in',...pick(e.data)});}catch{}});w.addEventListener('error',()=>window.__k.push({t:Math.round(performance.now()-t0),w:name,dir:'error'}));const post=w.postMessage.bind(w);w.postMessage=(v,...a)=>{try{window.__k.push({t:Math.round(performance.now()-t0),w:name,dir:'out',...pick(v)});}catch{}return post(v,...a);};return w;};window.Worker.prototype=W.prototype;})();`;
await send('Runtime.enable');await send('Page.enable');await send('Debugger.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:probe});
const results=[];
for(let i=0;i<Number(runs);i++){
 exc=[];await send('Debugger.setPauseOnExceptions',{state:'all'});
 await send('Page.reload',{});const t0=Date.now();let picked=false,outcome=null;
 while(Date.now()-t0<40000){
  if(!picked&&await js(`!!document.querySelector('[data-focus-id^="launch-account-"]')`)){await js(`document.querySelector('[data-focus-id^="launch-account-"]').click()`);picked=Date.now()-t0;}
  const v=await js(`JSON.stringify((()=>{const s=document.querySelector('.tv-shelf');if(!s)return null;return {cards:s.querySelectorAll('.tv-card').length,unknownTime:s.querySelectorAll('.tv-card-time[hidden]').length,code:s.querySelector('.tv-shelf-status')?.title??''}})())`);
  const o=v&&JSON.parse(v);if(o&&(o.cards||o.code)){outcome={atMs:Date.now()-t0,...o};break;}await sleep(100);
 }
 await send('Debugger.setPauseOnExceptions',{state:'none'});
 const k=JSON.parse(await js('JSON.stringify(window.__k||[])')||'[]');
 const r={run:i+1,pickedMs:picked,outcome,frames:k,exceptions:outcome?.code?exc:exc.length};results.push(r);
 console.log(i+1,JSON.stringify(outcome),'frames',k.length,'exc',exc.length);
 await sleep(3000);
}
writeFileSync(out,JSON.stringify(results,null,1));ws.close();

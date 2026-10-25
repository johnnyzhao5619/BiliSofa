// ADR-108 §6 device gate: playback with both kernels resident. Samples state only (no titles/URLs).
import { writeFileSync } from 'node:fs';
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let id=0;const pend=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);pend.get(m.id)?.(m.result?.result?.value);pend.delete(m.id);};
const js=expression=>new Promise(y=>{const i=++id;pend.set(i,y);ws.send(JSON.stringify({id:i,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(expr,ms)=>{const s=Date.now();while(Date.now()-s<ms){if(await js(expr))return true;await sleep(200);}return false;};
// Fresh list reads first, so both kernels are resident when playback starts.
await js(`document.querySelector('[data-focus-id="nav-library"]')?.click()`);await sleep(1500);
await js(`document.querySelector('[data-focus-id$="tab-watchlater"]')?.click()`);await sleep(1500);
await js(`document.querySelector('[data-focus-id="nav-home"]')?.click()`);
await until(`!!document.querySelector('.tv-shelf-row .tv-card')`,30000);
await js(`document.querySelector('.tv-shelf-row .tv-card').click()`);
await until(`!!document.querySelector('[data-focus-id="detail-play"]')`,15000);
await js(`document.querySelector('[data-focus-id="detail-play"]').click()`);
const started=await until(`(()=>{try{return webapis.avplay.getState()==='PLAYING'}catch{return false}})()`,60000);
const sample=`(()=>{const o={};try{o.state=webapis.avplay.getState();o.timeS=Math.round(webapis.avplay.getCurrentTime()/1000);
 const v=(webapis.avplay.getCurrentStreamInfo()||[]).find(s=>s.type==='VIDEO');if(v){const x=JSON.parse(v.extra_info||'{}');o.height=Number(x.Height)||null;o.width=Number(x.Width)||null;}}catch(e){o.avplay='unavailable'}
 try{o.heapMB=performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null}catch{o.heapMB=null}
 o.errorShown=/播放失败|无法播放|请重新打开/.test(document.body.innerText);return o;})()`;
const samples=[];
for(let i=0;i<40;i++){samples.push({atS:i*15,...await js(sample)});await sleep(15000);}
const out={startedWithin60s:started,samples};writeFileSync('gate-playback.json',JSON.stringify(out,null,1)+'\n');
const s=samples;console.log(JSON.stringify({started,first:s[0],last:s.at(-1),heights:[...new Set(s.map(x=>x.height))],states:[...new Set(s.map(x=>x.state))],errors:s.filter(x=>x.errorShown).length,maxHeap:Math.max(...s.map(x=>x.heapMB??0))}));
ws.close();

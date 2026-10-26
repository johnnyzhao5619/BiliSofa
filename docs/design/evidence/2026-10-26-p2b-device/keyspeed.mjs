// ADR-114 key response: from the first home card, send Right ×10 then Left ×10 through the inspector (trusted
// Input.dispatchKeyEvent) at a fixed interval, and record per press: keydown → second animation frame (the frame that
// shows the new focus), whether focus moved, and every frame interval during the run. No titles or ids are recorded.
// usage: node keyspeed.mjs <label> <intervalMs> <runs> [backdrop-off]
import {writeFileSync} from 'node:fs';
const [label='run',interval='150',runs='3',flag='']=process.argv.slice(2);
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let id=0;const pending=new Map();ws.onmessage=m=>{const d=JSON.parse(m.data);if(pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id);}};
const call=(method,params={})=>new Promise(y=>{const i=++id;pending.set(i,y);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>{const r=await call('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.result?.exceptionDetails)throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,300));return r.result?.result?.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const key=async(name,code)=>{for(const type of ['rawKeyDown','keyUp'])await call('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});};
console.log('build',await ev(`fetch('build.json').then(r=>r.json()).then(b=>b.version)`));
const css=flag==='backdrop-off'?'.tv-backdrop{display:none!important}':flag.startsWith('css:')?flag.slice(4):'';
if(css)console.log('injected',css,await ev(`(()=>{const s=document.createElement('style');s.id='ks-off';s.textContent=${JSON.stringify(css)};document.head.append(s);return 1})()`));
else await ev(`(()=>{document.getElementById('ks-off')?.remove();return 1})()`);
await ev(`(()=>{if(window.__ks)window.__ks.stop();const presses=[],frames=[];let last=performance.now(),on=true;
 const loop=t=>{if(!on)return;frames.push(Math.round((t-last)*10)/10);last=t;requestAnimationFrame(loop);};requestAnimationFrame(t=>{last=t;requestAnimationFrame(loop);});
 const down=e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const p={key:e.key[5],t0:performance.now(),from:document.activeElement};presses.push(p);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{p.ms=Math.round((performance.now()-p.t0)*10)/10;p.moved=document.activeElement!==p.from;delete p.from;delete p.t0;}));};
 window.addEventListener('keydown',down,true);window.__ks={presses,frames,stop(){on=false;window.removeEventListener('keydown',down,true);}};return 1})()`);
const result={label,build:null,interval:Number(interval),backdrop:flag==='backdrop-off'?'off':'on',css,runs:[]};
result.build=await ev(`fetch('build.json').then(r=>r.json()).then(b=>b.version)`);
for(let r=0;r<Number(runs);r++){
 const ready=await ev(`(()=>{const c=document.querySelector('[data-focus-id^=shelf-popular-]');if(!c){document.querySelector('.tv-shelf-row .tv-card')?.focus();return 'no card';}c.focus();window.__ks.presses.length=0;window.__ks.frames.length=0;return document.activeElement===c?'ok':'not focused'})()`);
 if(ready==='no card'&&r===0){await sleep(4000);r--;result.runs.length=0;continue;}if(ready!=='ok'){console.log('not ready',ready);break;}
 await sleep(1200);await ev(`(window.__ks.frames.length=0,1)`);
 for(let i=0;i<10;i++){await key('ArrowRight',39);await sleep(Number(interval));}
 for(let i=0;i<10;i++){await key('ArrowLeft',37);await sleep(Number(interval));}
 await sleep(800);
 const run=await ev(`JSON.parse(JSON.stringify({presses:window.__ks.presses,frames:window.__ks.frames,shown:document.querySelectorAll('.tv-backdrop.shown').length,covers:document.querySelectorAll('[data-focus-id^=shelf-popular-] img').length,cards:document.querySelectorAll('[data-focus-id^=shelf-popular-]').length}))`);
 result.runs.push(run);const ms=run.presses.map(p=>p.ms).filter(x=>x!==undefined).sort((a,b)=>a-b);
 console.log(`run ${r+1}: presses ${run.presses.length}, moved ${run.presses.filter(p=>p.moved).length}, p50 ${ms[Math.floor(ms.length/2)]} ms, max ${ms.at(-1)} ms, frames>50ms ${run.frames.filter(f=>f>50).length}/${run.frames.length}, covers ${run.covers}/${run.cards}`);
}
await ev(`(()=>{window.__ks&&window.__ks.stop();document.getElementById('ks-off')?.remove();delete window.__ks;return 1})()`);
writeFileSync(new URL(`ks-${label}.json`,import.meta.url),JSON.stringify(result));ws.close();

// P1-2b player key response: start the first 热门视频 card with a short OK, wait for playback, then per run
// (1) record frame intervals for 10 s with the control layer hidden and no input (the 200 ms refresh is the only work),
// (2) wake the controls, move along the main row Right ×6 then Left ×6 at 400 ms, recording keydown → second frame.
// Records only timings, counts and whether focus moved; no titles or ids.
// usage: node playerspeed.mjs <label> <runs>
import {writeFileSync} from 'node:fs';
const [label='player',runs='3']=process.argv.slice(2);
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let id=0;const pending=new Map();ws.onmessage=m=>{const d=JSON.parse(m.data);if(pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id);}};
const call=(method,params={})=>new Promise(y=>{const i=++id;pending.set(i,y);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>{const r=await call('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.result?.exceptionDetails)throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,300));return r.result?.result?.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const key=async(name,code,hold=60)=>{await call('Input.dispatchKeyEvent',{type:'rawKeyDown',key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});await sleep(hold);await call('Input.dispatchKeyEvent',{type:'keyUp',key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});};
const state=()=>ev(`(()=>{const p=document.querySelector('#overlays>section.tv-player');const a=document.activeElement;return {player:!!p,hidden:!!p?.classList.contains('vod-controls-hidden'),inMain:!!a?.closest?.('.tv-player-primary'),toggle:!!document.querySelector('[data-focus-id=vod-toggle]:not(:disabled)'),status:(document.querySelector('.tv-player-status')?.textContent||'').slice(0,12)}})()`);
const result={label,build:await ev(`fetch('build.json').then(r=>r.json()).then(b=>b.version)`),runs:[]};
console.log('build',result.build);
// Start playback from the first popular card (short OK).
const ready=await ev(`(()=>{const c=document.querySelector('[data-focus-id^=shelf-popular-]');if(!c)return 'no card';c.focus();return document.activeElement===c?'ok':'not focused'})()`);
if(ready!=='ok'){console.log('not ready',ready);process.exit(1);}
await key('Enter',13,120);
for(let i=0;i<60;i++){await sleep(500);const s=await state();if(s.player&&s.toggle&&!/缓冲|正在/.test(s.status))break;}
await sleep(3000);console.log('playing',JSON.stringify(await state()));
await ev(`(()=>{if(window.__ps)window.__ps.stop();const presses=[],frames=[];let last=performance.now(),on=true;
 const loop=t=>{if(!on)return;frames.push(Math.round((t-last)*10)/10);last=t;requestAnimationFrame(loop);};requestAnimationFrame(t=>{last=t;requestAnimationFrame(loop);});
 const down=e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const p={key:e.key[5],t0:performance.now(),from:document.activeElement};presses.push(p);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{p.ms=Math.round((performance.now()-p.t0)*10)/10;p.moved=document.activeElement!==p.from;delete p.from;delete p.t0;}));};
 window.addEventListener('keydown',down,true);window.__ps={presses,frames,stop(){on=false;window.removeEventListener('keydown',down,true);}};return 1})()`);
for(let r=0;r<Number(runs);r++){
 // (1) hidden layer: wait until the controls hide on their own, then 10 s without input.
 for(let i=0;i<40;i++){const s=await state();if(s.hidden)break;await sleep(500);}
 const hiddenBefore=(await state()).hidden;
 await ev(`(window.__ps.frames.length=0,1)`);await sleep(10000);
 const idle=await ev(`JSON.parse(JSON.stringify(window.__ps.frames))`);
 // (2) wake, land on the main row, then Right ×6 and Left ×6.
 await key('ArrowDown',40);await sleep(700);
 if(!(await state()).inMain){await ev(`(document.querySelector('[data-focus-id=vod-toggle]')?.focus(),1)`);await sleep(300);}
 await ev(`(window.__ps.presses.length=0,window.__ps.frames.length=0,1)`);
 for(let i=0;i<6;i++){await key('ArrowRight',39);await sleep(400);}
 for(let i=0;i<6;i++){await key('ArrowLeft',37);await sleep(400);}
 await sleep(600);
 const moves=await ev(`JSON.parse(JSON.stringify({presses:window.__ps.presses,frames:window.__ps.frames}))`);
 result.runs.push({hiddenBefore,idle,moves});
 const ms=moves.presses.filter(p=>p.moved).map(p=>p.ms).sort((a,b)=>a-b);
 console.log(`run ${r+1}: hidden ${hiddenBefore}; idle frames ${idle.length}, >50ms ${idle.filter(f=>f>50).length}, max ${Math.max(...idle)}; row moves ${ms.length}/12 p50 ${ms[Math.floor(ms.length/2)]} max ${ms.at(-1)} ms`);
}
await ev(`(()=>{window.__ps&&window.__ps.stop();delete window.__ps;return 1})()`);
writeFileSync(new URL(`ps-${label}.json`,import.meta.url),JSON.stringify(result));ws.close();

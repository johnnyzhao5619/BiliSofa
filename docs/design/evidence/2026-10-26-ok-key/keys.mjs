// Records Enter/OK keydown/keyup events (key, code, keyCode, repeat, time) for a while; Enter is held back from the app meanwhile.
const [mode='start']=process.argv.slice(2);
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let id=0;const ev=e=>new Promise(y=>{const i=++id;ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id===i)y(d.result?.result?.value);};ws.send(JSON.stringify({id:i,method:'Runtime.evaluate',params:{expression:e,returnByValue:true}}));});
if(mode==='start'){
 console.log(await ev(`(()=>{if(window.__keyrec)return 'already';const log=[],t0=performance.now();const on=e=>{const ok=e.key==='Enter'||e.keyCode===13;if(!ok&&e.type==='keyup')return;log.push({type:e.type,key:e.key,code:e.code,keyCode:e.keyCode,repeat:e.repeat,t:Math.round(performance.now()-t0)});if(ok){e.preventDefault();e.stopImmediatePropagation();}};
 window.addEventListener('keydown',on,true);window.addEventListener('keyup',on,true);window.__keyrec={log,stop(){window.removeEventListener('keydown',on,true);window.removeEventListener('keyup',on,true);}};setTimeout(()=>window.__keyrec&&window.__keyrec.stop(),180000);return 'recording';})()`));
}else{
 console.log(await ev(`JSON.stringify(window.__keyrec?window.__keyrec.log:null)`));
 if(mode==='stop')await ev(`(()=>{window.__keyrec&&window.__keyrec.stop();delete window.__keyrec;return 1})()`);
}
ws.close();

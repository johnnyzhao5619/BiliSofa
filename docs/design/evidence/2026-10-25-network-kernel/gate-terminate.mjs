// ADR-108 §3 device gate: 50 public kernels terminated mid-request, then fresh kernels must still answer.
import { writeFileSync } from 'node:fs';
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
const run=expression=>new Promise(y=>{ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id===1)y(m.result?.result?.value??m.result?.exceptionDetails?.text);};ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
const expression=`(async()=>{
 const scope=i=>({accountId:'guest',generation:1,mediaSessionId:'gate',requestId:'g'+i});
 const once=(i,kill)=>new Promise(res=>{const w=new Worker('public-kernel-worker.js');let k;const give=r=>{clearTimeout(k);clearTimeout(guard);w.terminate();res(r);};
  const guard=setTimeout(()=>give('timeout'),20000);
  w.onmessage=e=>{const v=e.data;if(v.type==='ready'){w.postMessage({version:1,type:'request',requestId:'k'+i,request:{version:1,scope:scope(i),operation:'public-search-hot'}});if(kill)k=setTimeout(()=>give('killed'),30);}else if(v.type==='result')give(v.result.kind);else if(v.type==='failed')give('failed');};
  w.onerror=()=>give('error');w.postMessage({version:1,type:'boot'});});
 const t0=performance.now(),loop={};for(let i=0;i<50;i++){const r=await once(i,true);loop[r]=(loop[r]||0)+1;}
 const after=[];for(let i=0;i<3;i++)after.push(await once(100+i,false));
 return JSON.stringify({loop,after,loopSeconds:Math.round((performance.now()-t0)/1000)});})()`;
const value=await run(expression);console.log(value);writeFileSync('gate-terminate.json',value+'\n');ws.close();

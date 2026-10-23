// Synthetic native boundary only; production Worker, parser, journal and UI run.
(function(){
 const m=Module,heap=new Uint8Array(100000);let length=0,status=200,uid='101',running=false,serial=0;
 const input=()=>new TextDecoder().decode(heap.subarray(0,heap.indexOf(0)));
 Object.assign(m,{HEAPU8:heap,callMain(){running=true;m.print('VODAPI:ready');},_vod_input_ptr:()=>0,_vod_input_capacity:()=>4096,_vod_body_ptr:()=>8192,_vod_body_length:()=>length,_vod_http_status:()=>status,_vod_curl_status:()=>0,_vod_response_clear(){heap.fill(0,8192);length=0;},
 _vod_import_cookies(){uid=/DedeUserID\t([0-9]+)/.exec(input())?.[1]||'101';heap.fill(0,0,4097);return 1;},
 _vod_begin(operation){const ticket=++serial,value=input();
  void fetch('/synthetic-pgc-follow',{method:'POST',body:JSON.stringify({operation,value,uid})}).then(async result=>{
   const raw=await result.text();if(!running||ticket!==serial)return;status=result.status;const bytes=new TextEncoder().encode(raw);heap.fill(0,8192);heap.set(bytes,8192);length=bytes.length;m.print('VODAPI:response:'+operation);
  });return 1;
 },_vod_stop(){running=false;serial++;heap.fill(0);length=0;setTimeout(()=>m.print('VODAPI:closed'),0);}});m.onRuntimeInitialized();
})();

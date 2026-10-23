// Synthetic native transport for the real cast Worker, parser and receiver.
// The sender advances only after a successful initial SetAVTransportURI reply.
(function () {
  const m=self.Module, heap=new Uint8Array(20000), variant='__VARIANT__';
  let alive=true,current,serial=0,busy=false,printing=false,media=0,sourceChecks=0;
  const queue=[], ns='urn:schemas-upnp-org:service:AVTransport:1';
  const uri='http://cdn.bilivideo.com/upgcxcode/fixture.mp4?deadline='+Math.floor(Date.now()/1000+3600)+'&sign=synthetic-private-marker';
  const escape=s=>s.replace(/&/g,'&amp;');
  function outside(){if(printing)throw Error('fixture.native_reentry');}
  function print(line){printing=true;try{m.print(line);}finally{printing=false;}}
  function emit(action,extra='',peer=0x0a000009){queue.push({action,extra:action==='Play'&&!extra?'<Speed>1</Speed>':extra,peer});pump();}
  function offer(part=1,peer=0x0a000009){emit('SetAVTransportURI','<CurrentURI>'+escape(uri+'&part='+part)+'</CurrentURI><CurrentURIMetaData></CurrentURIMetaData>',peer);}
  function pump(){if(!alive||busy||!queue.length)return;busy=true;const q=queue.shift();current={...q,id:++serial};const xml='<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:'+q.action+' xmlns:u="'+ns+'"><InstanceID>0</InstanceID>'+q.extra+'</u:'+q.action+'></s:Body></s:Envelope>';current.bytes=new TextEncoder().encode(xml);heap.fill(0,0,11000);heap.set(current.bytes,64);heap.set(new TextEncoder().encode('"'+ns+'#'+q.action+'"'),4500);print('CAST:rpc:'+current.id);}
  Object.assign(m,{
    HEAPU8:heap,_cast_rpc_enable:outside,_cast_transition_enable:outside,
    _cast_rpc_peer(id){outside();return current&&current.id===id?current.peer:0;},_cast_rpc_service(id){outside();return current&&current.id===id?3:0;},
    _cast_rpc_body(){outside();return 64;},_cast_rpc_body_size(){outside();return current.bytes.length;},_cast_rpc_action(){outside();return 4500;},_cast_rpc_buffer(){outside();return 5000;},_cast_source_buffer(){outside();return 12000;},_cast_transition_buffer(){outside();return 15500;},
    _cast_rpc_reply(id,status,length){outside();if(!current||current.id!==id)return 0;const action=current.action,body=new TextDecoder().decode(heap.subarray(5000,5000+length));fetch('/cast-fixture/result',{method:'POST',body:JSON.stringify({action,id,status,body})});const initial=id===1&&action==='SetAVTransportURI'&&status===200;current=undefined;busy=false;if(initial)setTimeout(()=>{if(alive){emit('Play');emit('GetTransportInfo');}},20);setTimeout(pump,0);return 1;},
    _cast_source_begin(){outside();sourceChecks++;setTimeout(()=>{if(alive)print(variant==='source-fail'?'CAST:source:failed:0:60':'CAST:source:pass');},40);return 1;},
    _cast_media_begin(){outside();if(sourceChecks<1)throw Error('fixture.source_not_checked');media++;print('BRIDGE:ready');return 1;},
    _cast_transition_begin(){outside();sourceChecks++;print('BRIDGE:stopped');print('CAST:transition:closed');setTimeout(()=>{if(alive)print('CAST:source:pass');},variant==='hold-transition'?1200:40);return 1;},
    _cast_stop(){outside();alive=false;clearInterval(poll);print('BRIDGE:stopped');print(variant==='unclosed'?'CAST:failed:17':'CAST:closed:0:0:0:0:0:0:0');},
    callMain(args){outside();if(args[0]!=='cast'||args.length!==4)throw Error('fixture.unapproved_native_operation');print('CAST:ready');setTimeout(()=>offer(),20);},
  });
  const poll=setInterval(()=>{if(alive)fetch('/cast-fixture/next').then(r=>r.json()).then(value=>{if(!alive||!value)return;if(value.part)offer(value.part,value.peer);else emit(value.action,value.extra||'',value.peer);}).catch(()=>{});},80);
  m.onRuntimeInitialized();
})();

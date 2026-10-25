// Synthetic C boundary. The production Worker, API parser, runtime and complete
// application run unchanged. No actual Bilibili account or network request.
(function(){
  const cdn='__CDN__';let rounds=0;
  const m=Module,heap=new Uint8Array(1000000);let apiOpen=false,relayOpen=false,cookie='',uid='0',apiLength=0,liveLength=0,http=200,op=0,serial=0,printing=false,rangeValid=false;
  const input=()=>new TextDecoder().decode(heap.subarray(0,heap.indexOf(0)));
  const liveInput=()=>new TextDecoder().decode(heap.subarray(5000,heap.indexOf(0,5000)));
  const print=line=>{printing=true;try{m.print(line);}finally{printing=false;}};
  const guard=()=>{if(printing)throw Error('fixture.native_reentry_before_flush');};
  const later=work=>setTimeout(()=>{if(relayOpen)work();},0);
  const body=(at,value)=>{const bytes=typeof value==='string'?new TextEncoder().encode(value):value;heap.fill(0,at,at+bytes.length+1);heap.set(bytes,at);return bytes.length;};
  const manifest='#EXTM3U\n#EXT-X-TARGETDURATION:3\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:3,\nsegment.ts\n';
  const ts=new Uint8Array(1128);for(let i=0;i<6;i++)ts[i*188]=0x47;
  Object.assign(m,{HEAPU8:heap,
    callMain(){guard();if(apiOpen||relayOpen)throw Error('fixture.overlapping_native_engines');apiOpen=true;print('VODAPI:ready');},
    _vod_input_ptr:()=>0,_vod_input_capacity:()=>4096,_vod_body_ptr:()=>8192,_vod_body_length:()=>apiLength,_vod_http_status:()=>http,_vod_curl_status:()=>0,
    _vod_response_clear(){guard();heap.fill(0,8192,180000);apiLength=0;},_vod_import_cookies(){guard();cookie=input();uid=/DedeUserID\t([0-9]+)/.exec(cookie)?.[1]||'101';heap.fill(0,0,4097);return 1;},
    _vod_begin(operation){guard();if(!apiOpen||relayOpen)throw Error('fixture.api_owner');const value=input(),ticket=++serial;
      void fetch('/synthetic-live-api',{method:'POST',body:JSON.stringify({operation,value,uid,authenticated:!!cookie})}).then(async response=>{const raw=await response.text();if(!apiOpen||ticket!==serial)return;http=response.status;apiLength=body(8192,raw);print('VODAPI:response:'+operation);});return 1;
    },
    _vod_stop(){guard();if(!apiOpen)return;apiOpen=false;cookie='';uid='0';serial++;heap.fill(0,0,180000);apiLength=0;setTimeout(()=>print('__CLOSE__'==='unknown'?'VODAPI:unclosed':'VODAPI:closed'),0);},
    _live_product_start(){guard();if(apiOpen||cookie||relayOpen)throw Error('fixture.cookie_or_engine_overlap');relayOpen=true;rounds++;print('LIVE:ready');return 1;},
    _live_input_ptr:()=>5000,_live_body_ptr:()=>200000,_live_body_length:()=>liveLength,_live_http_status:()=>op===1&&(['all-cdn-fail','tls-cdn'].includes(cdn)||cdn==='first-cdn-fail'&&rounds===1)?0:op===2?206:200,_live_curl_status:()=>op===1&&cdn==='tls-cdn'?60:op===1&&(cdn==='all-cdn-fail'||cdn==='first-cdn-fail'&&rounds===1)?28:0,
    _live_response_clear(){guard();heap.fill(0,200000);liveLength=0;},_live_product_range_valid:()=>rangeValid?1:0,
    _live_begin(operation){guard();if(!relayOpen||apiOpen||cookie)throw Error('fixture.non_anonymous_cdn');const url=liveInput();if(!/^https:\/\/(fixture|fallback)\.bilivideo\.com\/(live\.m3u8|segment\.ts)/.test(url))throw Error('fixture.invalid_cdn');if(url.includes('?&'))throw Error('fixture.changed_signed_query');op=operation;if(cdn==='hold-cdn')return 1;rangeValid=operation===2;liveLength=body(200000,operation===1?manifest:operation===2?ts.subarray(0,512):ts);later(()=>print('LIVE:response:'+operation));return 1;},
    _live_relay_start(){guard();if(!/^[a-f0-9]{32}$/.test(liveInput()))throw Error('fixture.invalid_local_token');print('LIVE:relay_ready');later(()=>print('LIVE:relay_manifest'));return 1;},
    _live_relay_segment:()=>1,
    _live_relay_reply(length,kind){guard();if(kind===1){const raw=new TextDecoder().decode(heap.subarray(200000,200000+length));if(raw.includes('https://')||!raw.includes('s1.ts'))throw Error('fixture.unrewritten_manifest');later(()=>print('LIVE:served_manifest'));later(()=>print('LIVE:relay_segment'));}else if(kind===2){if(length!==1128||heap[200000]!==0x47)throw Error('fixture.invalid_full_ts');later(()=>print('LIVE:served_segment'));}else throw Error('fixture.invalid_reply');return 1;},
    _live_stop(){guard();if(!relayOpen)return;relayOpen=false;heap.fill(0,200000);liveLength=0;setTimeout(()=>print('LIVE:closed'),0);}
  });m.onRuntimeInitialized();
})();

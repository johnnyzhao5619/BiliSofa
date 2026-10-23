// Synthetic C boundary only; production guest Workers and adapter stay real.
(function () {
  const m = self.Module, heap = new Uint8Array(600000), variant = '__VARIANT__';
  let size = 0, printing = false, bvid = '', operation = '', audioAttempts=0, rangeKind='';
  function print(line) { printing = true; try { m.print(line); } finally { printing = false; } }
  function outside() { if (printing) throw Error('fixture.native_reentry'); }
  function json(value) { const data = new TextEncoder().encode(JSON.stringify(value)); heap.set(data, 0); size = data.length; }
  const cdn = kind => 'https://synthetic.bilivideo.com/' + kind + '.m4s?deadline=' + Math.floor((Date.now() + 600000) / 1000);
  const track = kind => ({ id:kind === 'video' ? 16 : 30216, codecs:kind === 'video' ? 'avc1.64001e' : 'mp4a.40.2', mimeType:kind + '/mp4', bandwidth:kind === 'video' ? 500000 : 64000, width:640, height:360, baseUrl:cdn(kind), SegmentBase:{Initialization:'0-99',indexRange:'100-199'} });
  const timeoutVariant=variant.startsWith('audio-');
  const rangeRc=()=> operation==='guest-range'&&rangeKind==='audio' ? variant==='audio-timeout-once'&&audioAttempts===1||variant==='audio-timeout-always'||variant==='audio-expiring'||variant==='audio-http-timeout'?28:variant==='audio-tls'?60:0 : 0;
  Object.assign(m, {
    HEAPU8:heap, _guest_response_ptr:() => { outside(); return 0; }, _guest_response_length:() => { outside(); return size; },
    _guest_http_status:() => { outside(); return (variant==='audio-http'||variant==='audio-http-timeout')&&rangeKind==='audio'&&operation==='guest-range'?412:rangeRc()!==0?0:variant === 'source-http' && operation === 'guest-playurl' && bvid.endsWith('0') ? 403 : size ? 200 : 206; }, _guest_curl_status:() => { outside(); return rangeRc(); }, _guest_range_valid:() => { outside(); return 1; },
    _bridge_stop() { outside(); setTimeout(() => print('BRIDGE:stopped'), 0); },
    callMain(args) {
      outside(); const op = args[0]; operation = op;
      if (op === 'guest-popular') {
        json({code:0,data:{no_more:args[1] === '2',list:Array.from({length:4}, (_, i) => ({bvid:'BV' + (args[1] === '2' ? 'B' : 'A') + String(i).padStart(9,'0'),title:i ? '合成视频' + i : '<img src=x>合成视频0',duration:80,owner:{name:'合成UP'},stat:{view:10}}))}});
      } else if (op === 'guest-view') {
        bvid = args[1]; json({code:0,data:{bvid,cid:123,title:'合成视频',owner:{name:'合成UP'},state:0,rights:{pay:0,ugc_pay:variant === 'source-unsupported' && bvid.endsWith('0') ? 1 : 0,is_stein_gate:0},pages:[{cid:123,page:1,from:'vupload',duration:80}]}});
      } else if (op === 'guest-playurl') {
        json({code:0,data:{quality:16,timelength:80000,dash:{duration:80,video:[track('video')],audio:[track('audio')]}}});
      } else if (op === 'guest-range') { size = 0;rangeKind=args[2].includes('/audio.')?'audio':'video';
        if(rangeKind==='audio'){audioAttempts++;if(timeoutVariant)void fetch('__fixture-media/audio-'+audioAttempts).catch(()=>{});if(variant==='audio-expiring'){const now=Date.now;Date.now=()=>now()+550000;}}
        if(variant==='audio-unclosed'&&rangeKind==='audio')return;
      }
      else if (op === 'bridge') {
        if (!/^BV[A-Z0-9]{10}$/.test(bvid) || args.length !== 6) throw Error('fixture.bridge_args');
        setTimeout(() => { print('BRIDGE:ready'); if (variant === 'fatal') setTimeout(() => { throw Error('fixture.private-runtime-failure'); }, 200); }, 0); return;
      } else throw Error('fixture.unapproved_route');
      setTimeout(() => print('GUEST:closed'), timeoutVariant?20:0);
    },
  });
  m.onRuntimeInitialized();
})();

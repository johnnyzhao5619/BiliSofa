// Synthetic C response; production Worker, parser and ownership are unchanged.
(function(){
 const m=self.Module,variant='__VARIANT__',heap=new Uint8Array(70000);let size=0,printing=false;
 const outside=()=>{if(printing)throw Error('fixture.native_reentry');};
 Object.assign(m,{HEAPU8:heap,_guest_response_ptr:()=>{outside();return 0;},_guest_response_length:()=>{outside();return size;},_guest_http_status:()=>{outside();return variant==='invalid-status'?0:variant==='http'?412:200;},_guest_curl_status:()=>{outside();return 0;},callMain(args){
  outside();if(args.length!==1||args[0]!=='search-hot')throw Error('fixture.unapproved_route');
  const list=Array.from({length:variant==='empty'?0:10},(_,i)=>({pos:i+1,keyword:'热词搜索'+i,show_name:i===0?'<img src=x onerror=outside()>显示词':'热词显示'+i,goto_type:0,icon:'https://outside.invalid/icon.png',goto_value:'https://outside.invalid/',seid:'outside'}));
  if(variant==='invalid')list[0].keyword='x'.repeat(33);
  const bytes=new TextEncoder().encode(JSON.stringify({code:variant==='api'?-352:0,list}));heap.set(bytes);size=bytes.length;
  setTimeout(()=>{printing=true;try{m.print('GUEST:closed');}finally{printing=false;}},variant==='slow'?600:0);
 }});m.onRuntimeInitialized();
})();

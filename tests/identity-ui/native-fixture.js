// Synthetic C-module boundary for the REAL production identity Worker.
// No socket, real credential, Bilibili request or TV/SDK claim.
(function () {
  const variant = '__VARIANT__', m = self.Module, heap = new Uint8Array(200000);
  let bodyLength = 0, cookieLength = 0, currentUid = '101', printing = false, polls = 0, restored = false;
  function print(line) { printing = true; try { m.print(line); } finally { printing = false; } }
  function bytes(at, value) { const data = new TextEncoder().encode(value); heap.fill(0, at, at + data.length + 1); heap.set(data, at); return data.length; }
  const cookies = () => `.bilibili.com\tTRUE\t/\tFALSE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tFALSE\t0\tbili_jct\tsynthetic-csrf\n.bilibili.com\tTRUE\t/\tFALSE\t0\tDedeUserID\t${currentUid}\n`;
  Object.assign(m, {
    HEAPU8: heap, _auth_input_ptr: () => 0, _auth_input_capacity: () => 4096, _auth_body_ptr: () => 5000, _auth_body_length: () => bodyLength,
    _auth_http_status: () => 200, _auth_curl_status: () => 0, _auth_response_clear() { heap.fill(0,5000,140000); },
    _auth_cookie_ptr: () => 145000, _auth_cookie_length: () => cookieLength, _auth_cookie_clear() { heap.fill(0,145000,150000); },
    _auth_export_cookies() { cookieLength = bytes(145000,cookies()); return 1; },
    _auth_import_cookies() { restored = true; const raw = new TextDecoder().decode(heap.subarray(0,4096)); const found = raw.match(/DedeUserID\t([0-9]+)/); currentUid = found ? found[1] : '101'; heap.fill(0,0,4097); return 1; },
    _auth_begin(operation) {
      if (printing) throw Error('fixture.native_reentered_before_stdio_flush');
      if (operation < 0 || operation > 2) throw Error('fixture.unapproved_operation');
      if (variant === 'hold' && operation === 1 || variant === 'hold-verify' && operation === 2 && restored) return 1;
      const data = operation === 0 ? { qrcode_key: 'a'.repeat(32), url: 'https://account.bilibili.com/h5/account-h5/auth/scan-web?navhide=1&qrcode_key=' + 'a'.repeat(32) }
        : operation === 1 ? { code: polls++ === 0 ? 86090 : 0 } : { isLogin: true, mid: variant === 'mismatch' && restored ? 202 : Number(currentUid), uname: '<img src=x>合成身份',...(variant.startsWith('profile')?{level_info:{current_level:variant==='profile-malformed'?99:5},vipStatus:variant==='profile-inactive'?0:variant==='profile-malformed'?'1':1,vipType:variant==='profile-malformed'?99:2}:{}) };
      bodyLength = bytes(5000, JSON.stringify({ code: 0, data })); setTimeout(() => print('AUTH:response:' + operation), 0); return 1;
    },
    _auth_stop() { if (printing) throw Error('fixture.native_close_reentered'); setTimeout(() => print(variant === 'unclosed' ? 'AUTH:unclosed' : 'AUTH:closed'), 0); },
    callMain() { print('AUTH:ready'); },
  });
  m.onRuntimeInitialized();
})();

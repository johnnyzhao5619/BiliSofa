// Synthetic native HTTP/cURL replacement. Production TS Worker and adapters run.
(() => {
  const module = globalThis.Module; let generation = 0, running = false, length = 0, status = 0, authenticated = false;
  module.HEAPU8 = new Uint8Array(4194304 + 16384);
  const input = () => new TextDecoder().decode(module.HEAPU8.subarray(0, module.HEAPU8.indexOf(0)));
  Object.assign(module, {
    callMain() { running = true; module.print('VODAPI:ready'); },
    _vod_input_ptr: () => 0, _vod_input_capacity: () => 4096, _vod_body_ptr: () => 8192, _vod_body_length: () => length, _vod_http_status: () => status, _vod_curl_status: () => 0, _vod_source_valid: () => 0, _vod_source_total: () => 0,
    _vod_import_cookies() { authenticated = true; module.HEAPU8.fill(0, 0, 4097); return 1; },
    _vod_response_clear() { module.HEAPU8.fill(0, 8192); length = 0; },
    _vod_begin(operation) {
      const ticket = generation, value = input();
      void fetch('/synthetic-overlay-api', { method: 'POST', body: JSON.stringify({ operation, value, authenticated }) }).then(async response => {
        const body = new Uint8Array(await response.arrayBuffer()); if (!running || ticket !== generation) return;
        status = response.status; module.HEAPU8.set(body, 8192); length = body.length; module.print('VODAPI:response:' + operation);
      }).catch(() => { if (running && ticket === generation) module.onAbort(); }); return 1;
    },
    _vod_stop() { generation++; running = false; authenticated = false; module.HEAPU8.fill(0); length = 0; setTimeout(() => module.print('VODAPI:closed'), __CLOSE_DELAY__); },
  }); queueMicrotask(() => module.onRuntimeInitialized());
})();

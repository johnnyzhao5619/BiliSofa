/* Test-only stand-in for public-kernel-worker.js and account-read-kernel-worker.js (ADR-108). It speaks the kernel envelope and forwards each
 * request to the per-request Worker of the same lane, so the existing native fixtures keep serving their data.
 * A forwarded batch therefore carries that fixture's page of four rows; the lanes accept up to twenty. */
const files = { 'guest-popular': 'guest-worker.js', 'public-video-search': 'search-worker.js', 'public-user-search': 'search-worker.js', 'public-pgc-search': 'search-worker.js', 'public-search-hot': 'hot-search-worker.js',
  // The account kernel (P0b): each private read goes to the per-request lane Worker its fixture already fakes.
  'watch-later-read': 'library-worker.js', 'history-read': 'library-worker.js', 'favorite-folders-read': 'library-worker.js', 'favorite-items-read': 'library-worker.js', 'follow-updates-read': 'library-worker.js',
  'recommendations-read': 'recommend-worker.js', 'public-read': 'public-read-worker.js' };
let current;
onmessage = event => {
  const v = event.data;
  if (!v || v.version !== 1) return;
  if (v.type === 'boot') { postMessage({ version: 1, type: 'ready' }); return; }
  if (v.type === 'close') { if (current) current.worker.terminate(); current = undefined; postMessage({ version: 1, type: 'closed', confirmed: true }); return; }
  if (v.type === 'stop') { if (current && current.id === v.requestId) { current.worker.terminate(); current = undefined; postMessage({ version: 1, type: 'stopped', requestId: v.requestId }); } return; }
  if (v.type !== 'request') return;
  const id = v.requestId, identity = v.request.operation === 'identity-verify';
  // ADR-109: an identity check goes to the identity Worker (still packaged for QR login) in its own protocol.
  const worker = new Worker(identity ? 'identity-worker.js' : files[v.request.operation] || 'catalog-worker.js');
  current = { id, worker };
  worker.onmessage = message => {
    if (!current || current.id !== id || (message.data && message.data.closed === false)) return;
    worker.terminate(); current = undefined;
    const d = message.data, base = { version: 1, operation: 'identity-verify', scope: v.request.scope, closed: true };
    const result = !identity ? d : d && d.kind === 'verified' ? { ...base, kind: 'ok', identity: d.identity } : { ...base, kind: 'error', code: d && d.code || 'unknown' };
    postMessage({ version: 1, type: 'result', requestId: id, result });
  };
  worker.onerror = () => { if (!current || current.id !== id) return; current = undefined; postMessage({ version: 1, type: 'failed' }); };
  worker.postMessage(identity ? { version: 1, operation: 'identity', scope: v.request.scope, mode: 'verify', account: v.request.account } : v.request);
};

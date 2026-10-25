import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.env.BILISOFA_PROBE_ROOT ?? 'dist/probe');
// Synthetic UI only: a second folder for test-bundled files the package no longer carries (ADR-108 lane Workers).
const overlay = process.env.BILISOFA_TEST_OVERLAY ? resolve(process.env.BILISOFA_TEST_OVERLAY) : undefined;
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    if (url.pathname.includes('$WEBAPIS')) { response.writeHead(204).end(); return; }
    const data = await readFile(path).catch(error => { if (!overlay) throw error; const extra = resolve(overlay, `.${decodeURIComponent(url.pathname)}`); if (!extra.startsWith(overlay + sep)) throw error; return readFile(extra); });
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json' }[extname(path)] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }).end(data);
  } catch { response.writeHead(404).end(); }
});
server.listen(4173, '127.0.0.1', () => console.log('Desktop-only probe http://127.0.0.1:4173'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

// ADR-109 resume measurement: stamps inside the page (JS pauses while the app is hidden).
// node resume.mjs <port> arm | node resume.mjs <port> read <label> <out>
import { writeFileSync } from 'node:fs';
const [port, mode, label, out] = process.argv.slice(2);
const t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page'); const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(y => ws.onopen = y);
const js = expression => new Promise(y => { ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) y(m.result?.result?.value); }; ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })); });
if (mode === 'arm') {
  console.log(await js(`(() => { const b = window.__bs; const r = b.resume = { armed: true };
    const ready = () => { const row = document.querySelector('.tv-shelf-row'); return !!row && row.querySelectorAll('.tv-card img').length >= 4; };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { r.hiddenAt = performance.now(); r.startsAtHide = b.starts; r.coversAtHide = b.covers; return; }
      r.visibleAt = performance.now(); r.card = r.covers = undefined;
      const tick = () => { const now = performance.now();
        if (r.card === undefined && document.querySelector('.tv-shelf-row .tv-card')) r.card = Math.round(now - r.visibleAt);
        if (r.covers === undefined && ready()) { r.covers = Math.round(now - r.visibleAt); r.workerStarts = b.starts - r.startsAtHide; r.coverFetches = b.covers - r.coversAtHide; return; }
        if (now - r.visibleAt < 60000) setTimeout(tick, 20); };
      tick(); });
    return 'armed'; })()`));
} else {
  const r = JSON.parse(await js(`JSON.stringify(window.__bs.resume ?? null)`));
  const value = { label, at: new Date().toISOString(), resume: r && { hiddenSeconds: r.hiddenAt != null && r.visibleAt != null ? Math.round((r.visibleAt - r.hiddenAt) / 1000) : null, firstCardMs: r.card ?? null, firstRowCoversMs: r.covers ?? null, workerStarts: r.workerStarts ?? null, coverFetches: r.coverFetches ?? null } };
  console.log(JSON.stringify(value)); writeFileSync(out, JSON.stringify(value, null, 2) + '\n');
}
ws.close();

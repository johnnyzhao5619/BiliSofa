import { parseInitialQuery } from '../../contracts/src/index.ts';
import { parseSearchWords, suggestInitials } from './initials.ts';
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: unknown): void; };
// This is a fixed packaged data file, never a user supplied URL or script.
const ready = (async () => {
  const response = await fetch('search-words.json');
  if (!response.ok) throw new Error('asset');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('reader');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length; if (size > 2 * 1024 * 1024) throw new Error('bounds');
      chunks.push(part.value);
    }
  } catch { await reader.cancel(); throw new Error('asset'); } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return parseSearchWords(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
})();
// Handle load rejection immediately even before the first request arrives.
void ready.catch(() => {});
worker.onmessage = event => {
  let query;
  try { query = parseInitialQuery(event.data); } catch { return; }
  const owned = query;
  void ready.then(rows => worker.postMessage({ version: 1, scope: owned.scope, words: suggestInitials(rows, owned.initials) })).catch(() => worker.postMessage({ version: 1, scope: owned.scope, words: [], error: 'asset_unavailable' }));
};

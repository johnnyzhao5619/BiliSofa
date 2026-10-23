import { DomainError, record } from '../../contracts/src/index.ts';
import { liveCdnUrl, liveSourceUrl } from '../../contracts/src/live-probe.ts';
const invalid = (): never => { throw new DomainError('invalid'); };
function list(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) return invalid(); return value; }
// Fixed anonymous room, AVC/TS only. Other formats remain explicitly unsupported.
export function publicLiveSource(value: unknown): string {
  const v = record(value), data = record(v.data);
  // Public short ID 6 resolves to canonical 7734200 in the observed official API.
  if (v.code !== 0 || data.room_id !== 7734200 || data.short_id !== 6 || data.live_status !== 1 || data.encrypted || data.is_hidden || data.is_locked || Number(data.hidden_till ?? 0) !== 0) return invalid();
  const play = record(record(data.playurl_info).playurl);
  for (const stream of list(play.stream, 4)) {
    const s = record(stream); if (s.protocol_name !== 'http_hls') continue;
    for (const format of list(s.format, 4)) {
      const f = record(format); if (f.format_name !== 'ts') continue;
      for (const codec of list(f.codec, 4)) {
        const c = record(codec); if (c.codec_name !== 'avc') continue;
        if (typeof c.base_url !== 'string' || c.base_url.length > 1024 || !c.base_url.startsWith('/') || c.base_url.startsWith('//') || c.base_url.includes('#')) return invalid();
        for (const entry of list(c.url_info, 8)) {
          const info = record(entry);
          if (typeof info.host !== 'string' || typeof info.extra !== 'string' || !/^https:\/\/[^/]+\/?$/.test(info.host) || info.extra.length > 1024) return invalid();
          return liveSourceUrl(info.host,c.base_url,info.extra);
        }
      }
    }
  }
  return invalid();
}
export function plainLivePlaylist(text: string, source: string): { firstSegment: string; segments: number; targetSeconds: number } {
  liveCdnUrl(source, 'm3u8');
  if (text.length > 32768 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) return invalid();
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.shift() !== '#EXTM3U' || lines.length > 160 || lines.some(line => line.length > 2048)) return invalid();
  let target = 0, sequence = false, pending = 0, total = 0;
  const urls: string[] = [], tags = new Set<string>();
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('#')) {
      const tag = line.split(':')[0]!;
      if (pending) return invalid();
      if (tag === '#EXTINF') { const match = /^#EXTINF:([0-9]{1,2}(?:\.[0-9]{1,6})?),[^\r\n]*$/.exec(line); pending = match ? Number(match[1]) : 0; if (!(pending > 0 && pending <= 30)) return invalid(); continue; }
      if (tags.has(tag) && tag !== '#EXT-X-DISCONTINUITY') return invalid(); tags.add(tag);
      if (tag === '#EXT-X-TARGETDURATION') { if (!/^#EXT-X-TARGETDURATION:([1-9]|[12][0-9]|30)$/.test(line)) return invalid(); target = Number(line.split(':')[1]); }
      else if (tag === '#EXT-X-MEDIA-SEQUENCE') { if (!/^#EXT-X-MEDIA-SEQUENCE:[0-9]{1,12}$/.test(line)) return invalid(); sequence = true; }
      else if (!/^#EXT-X-VERSION:[1-7]$/.test(line) && !/^#EXT-X-ALLOW-CACHE:(YES|NO)$/.test(line) && line !== '#EXT-X-DISCONTINUITY') return invalid();
    } else {
      if (!pending || urls.length >= 24) return invalid();
      urls.push(liveCdnUrl(new URL(line, source).href, 'ts')); total += pending; pending = 0;
      if (total > 180) return invalid();
    }
  }
  if (!target || !sequence || pending || !urls.length) return invalid();
  return { firstSegment: urls[0]!, segments: urls.length, targetSeconds: target };
}
// Only this small, validated leaf format may reach the decoder. Every dependency
// is rewritten to an opaque local ID; keys/maps/master/unknown tags stay rejected.
export function rewritePlainLivePlaylist(text: string, source: string, local: (url: string) => string, idDigits:4|10=4): string {
  if(idDigits!==4&&idDigits!==10)return invalid();
  plainLivePlaylist(text, source);
  const output = text.replace(/\r\n/g, '\n').split('\n').map(line => {
    if (!line || line.startsWith('#')) return line;
    const name = local(liveCdnUrl(new URL(line, source).href, 'ts'));
    if (!(idDigits===4?/^s[1-9][0-9]{0,3}\.ts$/:/^s[1-9][0-9]{0,9}\.ts$/).test(name)) return invalid();
    return name;
  }).join('\n');
  if (output.length > 32768) return invalid();
  return output;
}

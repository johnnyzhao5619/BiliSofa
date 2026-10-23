import { SOURCE_POLICY_REASONS, type SourcePolicyReason } from '../../contracts/src/upnp.ts';
import { DomainError } from '../../contracts/src/index.ts';
import type { SoapRequest, UpnpService, TransportQuery, CastMediaOffer, SoapProbeFact } from '../../contracts/src/upnp.ts';
import type { CastCommand } from './session.ts';
const SOAP = 'http://schemas.xmlsoap.org/soap/envelope/', ENCODING = 'http://schemas.xmlsoap.org/soap/encoding/';
const serviceUri = (service: UpnpService) => `urn:schemas-upnp-org:service:${service}:1`;
// Exact Bilibili node listed by its official video diagnostics page (ADR-018).
// No other customer or subdomain of the shared CDN is eligible.
export const BILI_CAST_AKAM_HOST = 'upos-hz-mirrorakam.akamaized.net';
function castMediaHost(host: string): boolean {
  return host === BILI_CAST_AKAM_HOST || /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+bilivideo\.com$/.test(host);
}
export function isBiliCastAkamOffer(request: SoapRequest): boolean {
  if (request.kind !== 'offer') return false;
  try { return new URL(request.uri).hostname === BILI_CAST_AKAM_HOST; } catch { return false; }
}
const QUERIES: readonly TransportQuery[] = ['GetTransportInfo', 'GetPositionInfo', 'GetMediaInfo', 'GetDeviceCapabilities', 'GetTransportSettings', 'GetCurrentTransportActions'];
export type SoapInvalidStage = 'header' | 'xml' | 'envelope' | 'body' | 'action' | 'arguments' | 'media_fields';
export class SoapProtocolError extends DomainError {
  constructor(readonly fault: 401 | 402 | 501 | 718, readonly stage: SoapInvalidStage = 'arguments') { super(fault === 402 ? 'invalid' : 'unsupported'); }
}
function invalid(stage: SoapInvalidStage = 'arguments'): never { throw new SoapProtocolError(402, stage); }
function unsupported(fault: 401 | 501 | 718 = 401): never { throw new SoapProtocolError(fault); }
function xmlCharacter(code: number): boolean { return code === 9 || code === 10 || code === 13 || code >= 32 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) && (code & 0xffff) < 0xfffe; }
function validText(value: string): string {
  for (const char of value) if (!xmlCharacter(char.codePointAt(0)!)) invalid();
  return value;
}
function entities(value: string): string {
  let result = '', pos = 0;
  while (pos < value.length) {
    const start = value.indexOf('&', pos);
    if (start < 0) { result += value.slice(pos); break; }
    result += value.slice(pos, start);
    const end = value.indexOf(';', start + 1);
    if (end < 0 || end - start > 16) invalid();
    const name = value.slice(start + 1, end), known: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (Object.prototype.hasOwnProperty.call(known, name)) result += known[name];
    else {
      if (!/^#(?:[0-9]{1,7}|x[0-9a-fA-F]{1,6})$/.test(name)) invalid();
      const code = Number.parseInt(name.slice(name[1] === 'x' ? 2 : 1), name[1] === 'x' ? 16 : 10);
      if (!xmlCharacter(code)) invalid();
      result += String.fromCodePoint(code);
    }
    pos = end + 1;
  }
  return validText(result);
}
interface XmlNode { qname: string; name: string; ns: string; bindings: Map<string, string>; attrs: { name: string; ns: string; value: string }[]; children: XmlNode[]; value: string; }
// Deliberately small SOAP XML subset. No DOM, DTD, external entity, comments,
// arbitrary processing instruction or metadata XML interpretation.
function xml(raw: unknown): XmlNode {
  let input: string;
  if (typeof raw === 'string') input = raw;
  else if (raw instanceof Uint8Array) { if (raw.length > 4096) invalid(); try { input = new TextDecoder('utf-8', { fatal: true }).decode(raw); } catch { invalid(); } }
  else invalid();
  if (new TextEncoder().encode(input).length > 4096 || !input.length) invalid();
  validText(input); input = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let pos = 0, count = 0, attrCount = 0, root: XmlNode | undefined;
  const stack: XmlNode[] = [];
  const ws = () => { const start = pos; while (/[ \t\r\n]/.test(input[pos] ?? '') && pos < input.length) pos++; return pos > start; };
  const name = () => { const match = /^[A-Za-z_][A-Za-z0-9_.-]*(?::[A-Za-z_][A-Za-z0-9_.-]*)?/.exec(input.slice(pos)); if (!match || match[0].length > 129) invalid(); pos += match[0].length; return match[0]; };
  if (input.startsWith('<?xml')) { const declaration = /^<\?xml[ \t\n]+version[ \t\n]*=[ \t\n]*(['"])1\.0\1(?:[ \t\n]+encoding[ \t\n]*=[ \t\n]*(['"])[Uu][Tt][Ff]-8\2)?(?:[ \t\n]+standalone[ \t\n]*=[ \t\n]*(['"])(?:yes|no)\3)?[ \t\n]*\?>/.exec(input); if (!declaration) invalid(); pos = declaration[0].length; }
  while (pos < input.length) {
    const parent = stack.at(-1);
    if (input.startsWith('<![CDATA[', pos)) {
      const end = input.indexOf(']]>', pos + 9); if (!parent || end < 0) invalid(); parent.value += input.slice(pos + 9, end); pos = end + 3; continue;
    }
    if (input[pos] !== '<') {
      const end = input.indexOf('<', pos), stop = end < 0 ? input.length : end, text = input.slice(pos, stop);
      if (text.includes(']]>')) invalid();
      const value = entities(text); if (parent) parent.value += value; else if (value.trim()) invalid(); pos = stop; continue;
    }
    if (input.startsWith('</', pos)) { pos += 2; const closing = name(); ws(); if (input[pos++] !== '>' || !parent || closing !== parent.qname) invalid(); stack.pop(); continue; }
    if (input.startsWith('<!', pos) || input.startsWith('<?', pos)) invalid();
    pos++; const qname = name(), rawAttrs = new Map<string, string>(); let empty = false;
    for (;;) {
      const spaced = ws();
      if (input[pos] === '>') { pos++; break; }
      if (input.startsWith('/>', pos)) { pos += 2; empty = true; break; }
      if (!spaced || rawAttrs.size >= 8 || ++attrCount > 32) invalid();
      const key = name(); ws(); if (input[pos++] !== '=') invalid(); ws();
      const quote = input[pos++]; if (quote !== '"' && quote !== "'") invalid();
      const end = input.indexOf(quote, pos); if (end < 0 || end - pos > 256 || input.slice(pos, end).includes('<') || rawAttrs.has(key)) invalid();
      rawAttrs.set(key, entities(input.slice(pos, end))); pos = end + 1;
    }
    const bindings = new Map(parent?.bindings ?? [['xml', 'http://www.w3.org/XML/1998/namespace']]);
    for (const [key, value] of rawAttrs) if (key === 'xmlns' || key.startsWith('xmlns:')) {
      const prefix = key === 'xmlns' ? '' : key.slice(6);
      if (prefix === 'xmlns' || prefix === 'xml' || value === 'http://www.w3.org/2000/xmlns/' || value === 'http://www.w3.org/XML/1998/namespace' || prefix && !value) invalid();
      bindings.set(prefix, value);
    }
    const resolve = (qualified: string, attribute = false) => {
      const parts = qualified.split(':'), prefix = parts.length === 2 ? parts[0]! : '';
      if (prefix === 'xmlns' || prefix && !bindings.has(prefix)) invalid();
      return { name: parts.at(-1)!, ns: attribute && !prefix ? '' : bindings.get(prefix) ?? '' };
    };
    const attrs: XmlNode['attrs'] = [], expanded = new Set<string>();
    for (const [key, value] of rawAttrs) if (key !== 'xmlns' && !key.startsWith('xmlns:')) {
      const attribute = resolve(key, true), identity = `${attribute.ns}\0${attribute.name}`; if (expanded.has(identity)) invalid(); expanded.add(identity); attrs.push({ ...attribute, value });
    }
    const node: XmlNode = { qname, ...resolve(qname), bindings, attrs, value: '', children: [] };
    if (++count > 64 || stack.length >= 6) invalid();
    if (parent) parent.children.push(node); else { if (root) invalid(); root = node; }
    if (!empty) stack.push(node);
  }
  if (stack.length || !root) invalid();
  return root;
}
export function parseUpnpTime(value: string): number {
  const match = /^([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])(?:\.([0-9]{1,3}))?$/.exec(value);
  if (!match) invalid();
  const time = (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000 + Number((match[4] ?? '').padEnd(3, '0'));
  if (time > 86400000) unsupported(501); return time;
}
function soapAction(service: UpnpService, actionHeader: string, raw: unknown): XmlNode {
  if (!['AVTransport', 'ConnectionManager', 'RenderingControl'].includes(service) || typeof actionHeader !== 'string' || actionHeader.length > 160 || /[^\x20-\x7e]/.test(actionHeader)) invalid('header');
  const header = /^"urn:schemas-upnp-org:service:(AVTransport|ConnectionManager|RenderingControl):1#([A-Za-z][A-Za-z0-9]{0,63})"$/.exec(actionHeader.trim());
  if (!header || header[1] !== service) invalid('header');
  let envelope: XmlNode;
  try { envelope = xml(raw); } catch { invalid('xml'); }
  if (envelope.name !== 'Envelope' || envelope.ns !== SOAP || envelope.value.trim() || envelope.attrs.some(a => a.ns !== SOAP || a.name !== 'encodingStyle' || a.value !== ENCODING)) invalid('envelope');
  const children = [...envelope.children];
  if (children[0]?.name === 'Header') { const header = children.shift()!; if (header.ns !== SOAP || header.children.length || header.value.trim() || header.attrs.length) invalid('envelope'); }
  const body = children[0]; if (children.length !== 1 || !body || body.name !== 'Body' || body.ns !== SOAP || body.attrs.length || body.value.trim() || body.children.length !== 1) invalid('body');
  const action = body.children[0]!;
  if (action.ns !== serviceUri(service) || action.name !== header[2] || action.attrs.length || action.value.trim()) invalid('action');
  return action;
}
export function parseSoapRequest(service: UpnpService, actionHeader: string, raw: unknown): SoapRequest {
  const action = soapAction(service, actionHeader, raw), args = new Map<string, string>();
  for (const node of action.children) { if (node.attrs.length || node.children.length || node.ns && node.ns !== action.ns || args.has(node.name)) invalid(); args.set(node.name, node.value); }
  const exact = (names: string[]) => { if (args.size !== names.length || names.some(name => !args.has(name))) invalid(); };
  const instance = () => { if (args.get('InstanceID')?.trim() !== '0') unsupported(718); };
  if (service === 'ConnectionManager') {
    if (!['GetProtocolInfo', 'GetCurrentConnectionIDs'].includes(action.name)) unsupported(); exact([]);
    return { service, kind: 'query', action: action.name as 'GetProtocolInfo' | 'GetCurrentConnectionIDs' };
  }
  if (service === 'RenderingControl') {
    if (!['GetVolume', 'GetMute'].includes(action.name)) unsupported(); exact(['InstanceID', 'Channel']); instance(); if (args.get('Channel')?.trim() !== 'Master') unsupported(501);
    return { service, kind: 'query', action: action.name as 'GetVolume' | 'GetMute' };
  }
  if (QUERIES.includes(action.name as TransportQuery)) { exact(['InstanceID']); instance(); return { service, kind: 'query', action: action.name as TransportQuery }; }
  if (action.name === 'SetAVTransportURI') { exact(['InstanceID', 'CurrentURI', 'CurrentURIMetaData']); instance(); const uri = args.get('CurrentURI')!, metadata = args.get('CurrentURIMetaData')!; if (uri.length > 2048 || metadata.length > 2048) invalid('media_fields'); return { service, kind: 'offer', action: action.name, uri, metadata }; }
  if (action.name === 'Play') { exact(['InstanceID', 'Speed']); instance(); if (args.get('Speed')?.trim() !== '1') unsupported(501); return { service, kind: 'control', action: action.name }; }
  if (action.name === 'Pause' || action.name === 'Stop') { exact(['InstanceID']); instance(); return { service, kind: 'control', action: action.name }; }
  if (action.name === 'Seek') { exact(['InstanceID', 'Unit', 'Target']); instance(); if (args.get('Unit')?.trim() !== 'REL_TIME') unsupported(501); return { service, kind: 'control', action: action.name, timeMs: parseUpnpTime(args.get('Target')!.trim()) }; }
  unsupported();
}
// Neither function below executes a request. A transport must still bind it to
// the accepted peer/lease and pass controls through CastSession/PlayerCoordinator.
export function soapControl(request: SoapRequest): CastCommand {
  if (request.service !== 'AVTransport' || request.kind !== 'control') throw new DomainError('permission');
  if (request.action === 'Seek') {
    if (!Number.isSafeInteger(request.timeMs) || request.timeMs < 0 || request.timeMs > 86400000) invalid();
    return { type: 'seek', timeMs: request.timeMs };
  }
  if (request.action === 'Play') return { type: 'play' };
  if (request.action === 'Pause') return { type: 'pause' };
  if (request.action === 'Stop') return { type: 'stop' };
  throw new DomainError('permission');
}
export function validateSoapMediaOffer(request: SoapRequest, now: number): CastMediaOffer {
  if (request.service !== 'AVTransport' || request.kind !== 'offer' || request.action !== 'SetAVTransportURI' || !Number.isFinite(now) || now < 0 || typeof request.metadata !== 'string' || request.metadata.length > 2048) invalid();
  const raw = request.uri;
  if (typeof raw !== 'string' || !raw.length || raw.length > 2048 || !/^[\x21-\x7e]+$/.test(raw) || /[\\#]/.test(raw)) invalid();
  let url: URL; try { url = new URL(raw); } catch { invalid(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !castMediaHost(url.hostname) || !url.pathname.startsWith('/upgcxcode/') || !url.pathname.endsWith('.mp4')) throw new DomainError('permission');
  const deadline = url.searchParams.getAll('deadline');
  if (deadline.length !== 1 || !/^[0-9]{10}$/.test(deadline[0]!)) invalid();
  const expiresAt = Number(deadline[0]) * 1000;
  if (expiresAt < now + 60000 || expiresAt > now + 86400000) throw new DomainError('unsupported');
  return { url: raw, metadata: request.metadata, expiresAt, format: 'progressive-mp4' };
}

// Classify only an exact known action header; never return caller text.
export function isSoapOfferHeader(service: UpnpService, header: string): boolean {
  return service === 'AVTransport' && typeof header === 'string' && header.trim() === '"urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI"' && !/[^\x20-\x7e]/.test(header);
}


// Pure structure/policy classification. Even rejected requests are never fetched,
// normalized into commands or forwarded as raw text. Names outside the three
// known argument names produce only a fixed flag, never their spelling/value.
export function inspectSoapOffer(service: UpnpService, actionHeader: string, raw: unknown, now: number): SoapProbeFact[] {
  if (!isSoapOfferHeader(service, actionHeader)) return [];
  let action: XmlNode;
  try { action = soapAction(service, actionHeader, raw); } catch { return []; }
  const facts = new Set<SoapProbeFact>(), known = ['InstanceID', 'CurrentURI', 'CurrentURIMetaData'];
  const fields = new Map<string, XmlNode[]>();
  for (const node of action.children) {
    if (!known.includes(node.name)) facts.add('offer_args_extra');
    const nodes = fields.get(node.name) ?? []; nodes.push(node); fields.set(node.name, nodes);
    if (nodes.length > 1) facts.add('offer_args_duplicate');
    if (node.attrs.length) facts.add('offer_args_attributes');
    if (node.children.length) facts.add('offer_args_nested');
    if (node.ns && node.ns !== action.ns) facts.add('offer_args_namespace');
  }
  for (const [i, name] of known.entries()) if (!fields.has(name)) facts.add((['offer_args_missing_instance', 'offer_args_missing_uri', 'offer_args_missing_metadata'] as const)[i]!);
  if (!facts.size) facts.add('offer_args_ok');
  const uri = fields.get('CurrentURI');
  if (!uri) facts.add('offer_uri_missing');
  else if (uri.length !== 1 || uri[0]!.attrs.length || uri[0]!.children.length || uri[0]!.ns && uri[0]!.ns !== action.ns) facts.add('offer_uri_ambiguous');
  else facts.add(classifyOfferUri(uri[0]!.value, now));
  for (const metadata of fields.get('CurrentURIMetaData') ?? []) {
    if (metadata.children.length) facts.add('offer_metadata_nested');
    else facts.add(metadata.value.length > 2048 ? 'offer_metadata_oversized' : metadata.value.length ? 'offer_metadata_text' : 'offer_metadata_empty');
  }
  return [...facts];
}
function classifyOfferUri(raw: string, now: number): SoapProbeFact {
  if (!raw.length || raw.length > 2048 || !/^[\x21-\x7e]+$/.test(raw) || /[\\#]/.test(raw) || !Number.isFinite(now)) return 'offer_uri_malformed';
  let url: URL; try { url = new URL(raw); } catch { return 'offer_uri_malformed'; }
  if (url.protocol === 'http:') return 'offer_uri_http';
  if (url.protocol !== 'https:') return 'offer_uri_scheme';
  if (url.username || url.password || url.port || !castMediaHost(url.hostname)) return 'offer_uri_destination';
  if (!url.pathname.startsWith('/upgcxcode/')) return 'offer_uri_path';
  if (url.pathname.endsWith('.m4s')) return 'offer_uri_m4s';
  if (url.pathname.endsWith('.m3u8')) return 'offer_uri_m3u8';
  if (!url.pathname.endsWith('.mp4')) return 'offer_uri_other_format';
  const deadlines = url.searchParams.getAll('deadline');
  if (!deadlines.length) return 'offer_uri_deadline_missing';
  if (deadlines.length !== 1 || !/^[0-9]{10}$/.test(deadlines[0]!)) return 'offer_uri_deadline_invalid';
  const expiry = Number(deadlines[0]) * 1000;
  if (expiry < now + 60000 || expiry > now + 86400000) return 'offer_uri_deadline_unusable';
  return 'offer_uri_supported';
}


// W01 probe compatibility only: the three standard scalar fields remain
// mandatory/unique. Up to five additional scalar fields are ignored. Unused
// opaque metadata is discarded within the unchanged 4096-byte XML budget.
export function parseSoapProbeRequest(service: UpnpService, header: string, raw: unknown): SoapRequest {
  if (!isSoapOfferHeader(service, header)) return parseSoapRequest(service, header, raw);
  const action = soapAction(service, header, raw), args = new Map<string, string>();
  for (const node of action.children) {
    if (node.attrs.length || node.children.length || node.ns && node.ns !== action.ns || args.has(node.name)) invalid('arguments');
    args.set(node.name, node.value);
  }
  if (args.size > 8 || ['InstanceID', 'CurrentURI', 'CurrentURIMetaData'].some(name => !args.has(name))) invalid('arguments');
  if (args.get('InstanceID')!.trim() !== '0') unsupported(718);
  const uri = args.get('CurrentURI')!;
  if (uri.length > 2048) invalid('media_fields');
  return { service: 'AVTransport', kind: 'offer', action: 'SetAVTransportURI', uri, metadata: '' };
}
export function planSoapMediaProbe(request: SoapRequest, now: number): CastMediaOffer & { upgraded: boolean } {
  if (request.kind !== 'offer' || request.service !== 'AVTransport') throw new DomainError('permission');
  const upgraded = request.uri.startsWith('http://');
  // Preserve authority/path/query bytes. This creates only a test candidate;
  // no HTTP transfer or fallback is permitted and native rechecks the policy.
  const uri = upgraded ? 'https://' + request.uri.slice(7) : request.uri;
  return { ...validateSoapMediaOffer({ ...request, uri }, now), upgraded };
}

export function inspectSoapProbeCandidate(request: SoapRequest, now: number): SourcePolicyReason | undefined {
  if (request.kind !== 'offer' || request.service !== 'AVTransport') return undefined;
  const candidate = request.uri.startsWith('http://') ? 'https://' + request.uri.slice(7) : request.uri;
  const reason = classifyOfferUri(candidate, now).slice('offer_uri_'.length);
  if (!SOURCE_POLICY_REASONS.includes(reason as SourcePolicyReason)) invalid();
  return reason as SourcePolicyReason;
}

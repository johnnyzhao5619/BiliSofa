import { DomainError } from '../../contracts/src/index.ts';
import { parseReceiverSnapshot, receiverId, type ReceiverCommand, type ReceiverSnapshot } from '../../contracts/src/cast-receiver.ts';
import type { SoapRequest } from '../../contracts/src/upnp.ts';
import { CastSession } from './session.ts';
import { soapControl, planSoapMediaProbe } from './soap.ts';
import type { OfferContext } from '../../contracts/src/cast-offer-diagnostics.ts';

export interface ReceiverReply { status: 200 | 500; body: string; }
export type ReceiverDecision = { reply: ReceiverReply; transition?: { generation: number; url: string }; metadata?: 'generated' | 'omitted'; denied?: 'owner' | 'source_changed' | 'stale' | 'locked' | 'busy' | 'limit'; stale?: 'snapshot_missing' | 'snapshot_old' | 'expired' | 'clock' } | { command: ReceiverCommand; id: number };
const wrap = (s: string) => `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>${s}</s:Body></s:Envelope>`;
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const time = (ms: number) => { const sec = Math.floor(ms / 1000); return [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map(n => String(n).padStart(2, '0')).join(':'); };
export function receiverFault(code: 501 | 701 | 705 = 701): ReceiverReply {
  return { status: 500, body: wrap(`<s:Fault><faultcode>s:Client</faultcode><faultstring>UPnPError</faultstring><detail><UPnPError xmlns="urn:schemas-upnp-org:control-1-0"><errorCode>${code}</errorCode><errorDescription>${code === 705 ? 'Transport is locked' : code === 501 ? 'Action Failed' : 'Transition not available'}</errorDescription></UPnPError></detail></s:Fault>`) };
}
function success(action: string, content = ''): ReceiverReply { return { status: 200, body: wrap(`<u:${action}Response xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">${content}</u:${action}Response>`) }; }


// Original bounded DIDL serializer. Never parses/echoes sender metadata or adds
// another resource; the URI is already approved and private to its owner.
function metadataReply(action: string, uri: string, durationMs: number, content: (metadata: string) => string): ReceiverDecision {
  const duration = durationMs > 0 ? ` duration="${time(durationMs)}"` : '';
  const didl = `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"><item id="0" parentID="-1" restricted="1"><dc:title>BiliSofa cast source</dc:title><upnp:class>object.item.videoItem</upnp:class><res protocolInfo="http-get:*:video/mp4:*"${duration}>${escape(uri)}</res></item></DIDL-Lite>`;
  const reply = success(action, content(escape(didl)));
  if (new TextEncoder().encode(reply.body).length <= 6144) return { reply, metadata: 'generated' };
  const fallback = success(action, content('NOT_IMPLEMENTED'));
  return { reply: new TextEncoder().encode(fallback.body).length <= 6144 ? fallback : receiverFault(501), metadata: 'omitted' };
}

// Private Worker domain only. Neither the peer nor original URI is an IPC DTO.
// Address binding is a local-network ownership rule, not authenticated identity.
export class ApprovedSoapReceiver {
  private readonly session = new CastSession();
  private owner: string | undefined;
  private uri = '';
  private until = 0;
  private approvedAt = 0;
  private startUntil = 0;
  private starting = false;
  private snapshot: ReceiverSnapshot | undefined;
  private observedAt = 0;
  private lastId = 0;
  private count = 0;
  private pending: { id: number; action: string; at: number } | undefined;
  private generation = 1;
  constructor(private readonly transitions = false, private readonly product=false) {}
  offerContext(): OfferContext { return { generation: this.generation, session: this.transitions, state: this.snapshot?.state ?? 'missing', remote: this.snapshot?.controller === 'remote' }; }
  owns(peer: string): boolean { return this.owner === peer; }
  approve(peer: string, request: SoapRequest, now: number): void {
    if (this.owner || !/^[0-9a-f]{8}$/.test(peer)) throw new DomainError('permission');
    const offer = planSoapMediaProbe(request, now);
    if (request.kind !== 'offer') throw new DomainError('permission');
    this.session.accept(peer, 'approved', true); this.owner = peer; this.approvedAt = now; this.uri = request.uri; this.until = this.product?offer.expiresAt-5000:Math.min(now + 300000, offer.expiresAt - 5000); this.startUntil = Math.min(this.until, now + 30000); this.starting = true;
  }
  update(value: unknown, now: number): boolean {
    const snapshot = parseReceiverSnapshot(value,this.product);
    if (!this.owner || !Number.isFinite(now) || now < this.approvedAt || now < this.observedAt || now >= this.until || this.transitions && snapshot.generation !== this.generation || snapshot.frame <= (this.snapshot?.frame ?? 0)) return false;
    if (['playing', 'paused', 'idle', 'error'].includes(snapshot.state)) this.starting = false;
    this.snapshot = snapshot; this.observedAt = now; this.session.transfer(snapshot.controller); return true;
  }
  handle(request: SoapRequest, peer: string, id: number, now: number): ReceiverDecision {
    receiverId(id,this.product?2147483647:1024);
    if (!this.owner || peer !== this.owner || request.service !== 'AVTransport') return { reply: receiverFault(), denied: 'owner' };
    if (!Number.isFinite(now) || now < this.approvedAt || now >= this.until) return { reply: receiverFault(), denied: 'stale', stale: 'expired' };
    if (this.snapshot && now < this.observedAt) return { reply: receiverFault(), denied: 'stale', stale: 'clock' };
    // Reaffirming an already TV-approved exact URI does not query the decoder.
    if (request.kind === 'offer') {
      if (request.uri === this.uri) return { reply: success(request.action) };
      if (!this.transitions) return { reply: receiverFault(), denied: 'source_changed' };
      if (!this.snapshot || now - this.observedAt > 3000) return { reply: receiverFault(), denied: 'stale', stale: this.snapshot ? 'snapshot_old' : 'snapshot_missing' };
      if (this.snapshot.controller !== 'sender') return { reply: receiverFault(705), denied: 'locked' };
      if (this.pending || this.snapshot.seeking || ['preparing', 'error'].includes(this.snapshot.state)) return { reply: receiverFault(), denied: 'busy' };
      if (this.generation >= (this.product?2147483646:4) || !this.product&&(this.count >= 24 || now + 10000 >= this.until)) return { reply: receiverFault(), denied: 'limit' };
      let offer: ReturnType<typeof planSoapMediaProbe>;
      try { offer = planSoapMediaProbe(request, now); } catch { return { reply: receiverFault(), denied: 'source_changed' }; }
      if(this.product)this.until=offer.expiresAt-5000;this.generation++; this.count=Math.min(this.count+1,Number.MAX_SAFE_INTEGER); this.uri = request.uri; this.snapshot = undefined;
      this.starting = true; this.startUntil = Math.min(this.until, now + 30000);
      return { reply: success(request.action), transition: { generation: this.generation, url: offer.url } };
    }
    // TV approval already queued one autoplay. Its bounded prepare phase can
    // honestly report TRANSITIONING and accept an idempotent Play intent before
    // the first UI frame; it cannot manufacture PLAYING or dispatch another play.
    const startup = this.starting && now < this.startUntil && (!this.snapshot || this.snapshot.state === 'preparing');
    if (!startup && (!this.snapshot || now - this.observedAt > 3000)) return { reply: receiverFault(), denied: 'stale', stale: this.snapshot ? 'snapshot_old' : 'snapshot_missing' };
    const s: ReceiverSnapshot = this.snapshot ?? { frame: 0, state: 'preparing', timeMs: 0, durationMs: 0, seeking: false, controller: 'sender' };
    if (startup && request.kind === 'control') return request.action === 'Play' ? { reply: success(request.action) } : { reply: receiverFault(), denied: 'busy' };
    const state = startup || this.pending || s.seeking || s.state === 'preparing' ? 'TRANSITIONING' : ({ idle: 'STOPPED', ready: 'STOPPED', playing: 'PLAYING', paused: 'PAUSED_PLAYBACK', error: 'STOPPED', preparing: 'TRANSITIONING' } as const)[s.state];
    if (request.kind === 'query') {
      const actions = s.controller !== 'sender' || state === 'TRANSITIONING' || s.state === 'error' ? '' : state === 'PLAYING' ? 'Pause,Stop,Seek' : state === 'PAUSED_PLAYBACK' ? 'Play,Stop,Seek' : 'Play,Stop';
      switch (request.action) {
        case 'GetTransportInfo': return { reply: success(request.action, `<CurrentTransportState>${state}</CurrentTransportState><CurrentTransportStatus>${s.state === 'error' ? 'ERROR_OCCURRED' : 'OK'}</CurrentTransportStatus><CurrentSpeed>1</CurrentSpeed>`) };
        case 'GetPositionInfo': return metadataReply(request.action, this.uri, s.durationMs, metadata => `<Track>1</Track><TrackDuration>${time(s.durationMs)}</TrackDuration><TrackMetaData>${metadata}</TrackMetaData><TrackURI>${escape(this.uri)}</TrackURI><RelTime>${time(s.timeMs)}</RelTime><AbsTime>${time(s.timeMs)}</AbsTime><RelCount>2147483647</RelCount><AbsCount>2147483647</AbsCount>`);
        case 'GetMediaInfo': return metadataReply(request.action, this.uri, s.durationMs, metadata => `<NrTracks>1</NrTracks><MediaDuration>${time(s.durationMs)}</MediaDuration><CurrentURI>${escape(this.uri)}</CurrentURI><CurrentURIMetaData>${metadata}</CurrentURIMetaData><NextURI></NextURI><NextURIMetaData></NextURIMetaData><PlayMedium>NETWORK</PlayMedium><RecordMedium>NOT_IMPLEMENTED</RecordMedium><WriteStatus>NOT_IMPLEMENTED</WriteStatus>`);
        case 'GetCurrentTransportActions': return { reply: success(request.action, `<Actions>${actions}</Actions>`) };
        case 'GetDeviceCapabilities': return { reply: success(request.action, '<PlayMedia>NETWORK</PlayMedia><RecMedia>NOT_IMPLEMENTED</RecMedia><RecQualityModes>NOT_IMPLEMENTED</RecQualityModes>') };
        case 'GetTransportSettings': return { reply: success(request.action, '<PlayMode>NORMAL</PlayMode><RecQualityMode>NOT_IMPLEMENTED</RecQualityMode>') };
      }
    }
    if (s.controller !== 'sender') return { reply: receiverFault(705), denied: 'locked' };
    if (!this.product && this.count >= 24) return { reply: receiverFault(), denied: 'limit' };
    if (this.pending || s.seeking || s.state === 'preparing' || s.state === 'error' || id <= this.lastId) return { reply: receiverFault(), denied: 'busy' };
    const command = soapControl(request);
    if (command.type === 'seek' && (!['playing', 'paused', 'ready'].includes(s.state) || s.durationMs > 0 && command.timeMs >= s.durationMs)) return { reply: receiverFault() };
    try { this.session.command(peer, 'approved', id, command); } catch { return { reply: receiverFault() }; }
    this.lastId = id; this.count++; this.pending = { id, action: request.action, at: now };
    return { id, command };
  }
  acknowledge(id: number, accepted: boolean, now: number): ReceiverReply | undefined {
    if (!this.pending || id !== this.pending.id) return undefined;
    const pending = this.pending; this.pending = undefined;
    return this.owner && now < this.until && now >= pending.at && now - pending.at <= 2000 && accepted ? success(pending.action) : receiverFault(501);
  }
  end(): void { this.session.end(); this.owner = undefined; this.uri = ''; this.until = this.approvedAt = 0; this.generation = 1; this.count = this.lastId = 0; this.startUntil = 0; this.starting = false; this.snapshot = undefined; this.observedAt = 0; this.pending = undefined; }
}

import type { UpnpService, SoapProbeFact } from '../../contracts/src/upnp.ts';
import { parseSoapProbeRequest, validateSoapMediaOffer, SoapProtocolError, isSoapOfferHeader } from './soap.ts';
const SOAP = 'http://schemas.xmlsoap.org/soap/envelope/';
export interface SoapProbeReply { status: 200 | 500; body: string; fact: SoapProbeFact; }
function wrap(content: string): string { return `<?xml version="1.0"?><s:Envelope xmlns:s="${SOAP}" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>${content}</s:Body></s:Envelope>`; }
function fault(fact: SoapProbeFact, code: 401 | 402 | 501 | 701 | 718): SoapProbeReply {
  const description = { 401: 'Invalid Action', 402: 'Invalid Args', 501: 'Action Failed', 701: 'Transition not available', 718: 'Invalid InstanceID' }[code];
  return { status: 500, fact, body: wrap(`<s:Fault><faultcode>s:Client</faultcode><faultstring>UPnPError</faultstring><detail><UPnPError xmlns="urn:schemas-upnp-org:control-1-0"><errorCode>${code}</errorCode><errorDescription>${description}</errorDescription></UPnPError></detail></s:Fault>`) };
}
// Truthful state of this discovery probe: no accepted URI, connected sender or
// running player. Never substitute this for a real player's transport snapshot.
export function discoverySoapReply(service: UpnpService, actionHeader: string, raw: unknown, now: number): SoapProbeReply {
  let request;
  try { request = parseSoapProbeRequest(service, actionHeader, raw); }
  catch (error) {
    if (error instanceof SoapProtocolError && error.fault === 402) return fault(`${isSoapOfferHeader(service, actionHeader) ? 'offer_' : ''}invalid_${error.stage}`, 402);
    return fault(error instanceof SoapProtocolError ? 'unsupported' : 'invalid', error instanceof SoapProtocolError ? error.fault : 402);
  }
  if (request.kind === 'offer') {
    try { validateSoapMediaOffer(request, now); return fault('mp4_offer_rejected', 701); }
    catch { return fault('uri_offer_rejected', 701); }
  }
  if (request.kind === 'control') return fault(({ Play: 'play_rejected', Pause: 'pause_rejected', Stop: 'stop_rejected', Seek: 'seek_rejected' } as const)[request.action], 701);
  const reply = (fact: SoapProbeFact, content: string): SoapProbeReply => ({ status: 200, fact, body: wrap(`<u:${request.action}Response xmlns:u="urn:schemas-upnp-org:service:${service}:1">${content}</u:${request.action}Response>`) });
  switch (request.action) {
    case 'GetTransportInfo': return reply('transport_query', '<CurrentTransportState>NO_MEDIA_PRESENT</CurrentTransportState><CurrentTransportStatus>OK</CurrentTransportStatus><CurrentSpeed>1</CurrentSpeed>');
    case 'GetPositionInfo': return reply('position_query', '<Track>0</Track><TrackDuration>00:00:00</TrackDuration><TrackMetaData></TrackMetaData><TrackURI></TrackURI><RelTime>00:00:00</RelTime><AbsTime>NOT_IMPLEMENTED</AbsTime><RelCount>2147483647</RelCount><AbsCount>2147483647</AbsCount>');
    case 'GetMediaInfo': return reply('media_query', '<NrTracks>0</NrTracks><MediaDuration>00:00:00</MediaDuration><CurrentURI></CurrentURI><CurrentURIMetaData></CurrentURIMetaData><NextURI></NextURI><NextURIMetaData></NextURIMetaData><PlayMedium>NONE</PlayMedium><RecordMedium>NOT_IMPLEMENTED</RecordMedium><WriteStatus>NOT_IMPLEMENTED</WriteStatus>');
    case 'GetDeviceCapabilities': return reply('capabilities_query', '<PlayMedia>NETWORK</PlayMedia><RecMedia>NOT_IMPLEMENTED</RecMedia><RecQualityModes>NOT_IMPLEMENTED</RecQualityModes>');
    case 'GetTransportSettings': return reply('settings_query', '<PlayMode>NORMAL</PlayMode><RecQualityMode>NOT_IMPLEMENTED</RecQualityMode>');
    case 'GetCurrentTransportActions': return reply('actions_query', '<Actions></Actions>');
    case 'GetProtocolInfo': return reply('protocol_query', '<Source></Source><Sink>http-get:*:video/mp4:*</Sink>');
    case 'GetCurrentConnectionIDs': return reply('connections_query', '<ConnectionIDs></ConnectionIDs>');
    case 'GetVolume': return fault('volume_query_rejected', 501);
    case 'GetMute': return fault('mute_query_rejected', 501);
  }
}

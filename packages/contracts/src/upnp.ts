// Private Worker-domain values, not diagnostic IPC. Media offers require a
// separate destination/expiry check and TV-approved CastSession before use.
export type UpnpService = 'AVTransport' | 'ConnectionManager' | 'RenderingControl';
export type TransportQuery = 'GetTransportInfo' | 'GetPositionInfo' | 'GetMediaInfo' | 'GetDeviceCapabilities' | 'GetTransportSettings' | 'GetCurrentTransportActions';
export type SoapRequest =
  | { service: 'AVTransport'; kind: 'query'; action: TransportQuery }
  | { service: 'ConnectionManager'; kind: 'query'; action: 'GetProtocolInfo' | 'GetCurrentConnectionIDs' }
  | { service: 'RenderingControl'; kind: 'query'; action: 'GetVolume' | 'GetMute' }
  | { service: 'AVTransport'; kind: 'control'; action: 'Play' | 'Pause' | 'Stop' }
  | { service: 'AVTransport'; kind: 'control'; action: 'Seek'; timeMs: number }
  | { service: 'AVTransport'; kind: 'offer'; action: 'SetAVTransportURI'; uri: string; metadata: string };
export interface CastMediaOffer { url: string; metadata: string; expiresAt: number; format: 'progressive-mp4'; }

export const SOAP_PROBE_FACTS = ['invalid', 'unsupported', 'transport_query', 'position_query', 'media_query', 'capabilities_query', 'settings_query', 'actions_query', 'protocol_query', 'connections_query', 'volume_query_rejected', 'mute_query_rejected', 'control_rejected', 'mp4_offer_rejected', 'uri_offer_rejected',
  'invalid_header', 'invalid_xml', 'invalid_envelope', 'invalid_body', 'invalid_action', 'invalid_arguments', 'invalid_media_fields',
  'offer_invalid_header', 'offer_invalid_xml', 'offer_invalid_envelope', 'offer_invalid_body', 'offer_invalid_action', 'offer_invalid_arguments', 'offer_invalid_media_fields',
  'play_rejected', 'pause_rejected', 'stop_rejected', 'seek_rejected',
  'offer_args_missing_instance', 'offer_args_missing_uri', 'offer_args_missing_metadata', 'offer_args_extra', 'offer_args_duplicate', 'offer_args_attributes', 'offer_args_nested', 'offer_args_namespace', 'offer_args_ok',
  'offer_uri_missing', 'offer_uri_ambiguous', 'offer_uri_malformed', 'offer_uri_http', 'offer_uri_scheme', 'offer_uri_destination', 'offer_uri_path', 'offer_uri_m4s', 'offer_uri_m3u8', 'offer_uri_other_format', 'offer_uri_deadline_missing', 'offer_uri_deadline_invalid', 'offer_uri_deadline_unusable', 'offer_uri_supported',
  'offer_metadata_empty', 'offer_metadata_text', 'offer_metadata_nested', 'offer_metadata_oversized'] as const;
export type SoapProbeFact = typeof SOAP_PROBE_FACTS[number];

// Append-only order: v1 summary bit positions are part of the diagnostic format.
// No external text, identities, URIs or request contents can enter this summary.
export const SOURCE_POLICY_REASONS = ['missing', 'ambiguous', 'malformed', 'http', 'scheme', 'destination', 'path', 'm4s', 'm3u8', 'other_format', 'deadline_missing', 'deadline_invalid', 'deadline_unusable', 'supported'] as const;
export type SourcePolicyReason = typeof SOURCE_POLICY_REASONS[number];
export const CAST_MEDIA_REQUESTS = ['get_full', 'get_open', 'get_range', 'get_suffix', 'head'] as const;
export function mediaRequestSummary(codes: Iterable<string>): string | undefined {
  let bits = 0;
  for (const code of codes) { const index = CAST_MEDIA_REQUESTS.findIndex(kind => code === 'cast.media_request_' + kind); if (index >= 0) bits |= 1 << index; }
  return bits ? 'cast.media_requests_v1_' + bits.toString(16).padStart(2, '0') : undefined;
}
export function isMediaRequestSummary(code: string): boolean { return /^cast\.media_requests_v1_(?:0[1-9a-f]|1[0-9a-f])$/.test(code); }
// Extra facts: two flow snapshots, one limit reason, three bounded reconnects, three validated-range continuation facts,
// at most 24 receiver command frames and 18 deduplicated receiver facts.
export const CAST_PROGRESS_LIMIT = SOAP_PROBE_FACTS.length + SOURCE_POLICY_REASONS.length + 20 + CAST_MEDIA_REQUESTS.length + 6 + 24 + 29 + 3;
export function soapProbeSummary(codes: Iterable<string>): string | undefined {
  const words = [0, 0];
  for (const code of codes) {
    const index = SOAP_PROBE_FACTS.findIndex(fact => code === `cast.soap_${fact}`);
    if (index >= 0) words[index >>> 5] = (words[index >>> 5]! | (1 << (index & 31))) >>> 0;
  }
  return words.some(Boolean) ? `cast.soap_summary_v1_${words.map(word => word.toString(16).padStart(8, '0')).join('')}` : undefined;
}
export function decodeSoapProbeSummary(code: string): SoapProbeFact[] {
  const match = /^cast\.soap_summary_v1_([a-f0-9]{8})([a-f0-9]{8})$/.exec(code);
  if (!match) return [];
  const words = [Number.parseInt(match[1]!, 16), Number.parseInt(match[2]!, 16)];
  // Unknown bits are not silently interpreted by an older reader.
  for (let i = SOAP_PROBE_FACTS.length; i < 64; i++) if ((words[i >>> 5]! >>> (i & 31)) & 1) return [];
  return SOAP_PROBE_FACTS.filter((_, i) => (words[i >>> 5]! >>> (i & 31)) & 1);
}

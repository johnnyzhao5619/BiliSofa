import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../../packages/contracts/src/index.ts';
import type { SoapRequest, UpnpService } from '../../packages/contracts/src/upnp.ts';
import { parseSoapRequest, parseUpnpTime, soapControl, validateSoapMediaOffer } from '../../packages/cast/src/soap.ts';
import { CastSession } from '../../packages/cast/src/session.ts';
const ns = 'urn:schemas-upnp-org:service:AVTransport:1';
const envelope = (action: string, args = '<InstanceID>0</InstanceID>', service: UpnpService = 'AVTransport') => `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${action} xmlns:u="urn:schemas-upnp-org:service:${service}:1">${args}</u:${action}></s:Body></s:Envelope>`;
const header = (action: string, service: UpnpService = 'AVTransport') => `"urn:schemas-upnp-org:service:${service}:1#${action}"`;
const parse = (action: string, args?: string) => parseSoapRequest('AVTransport', header(action), envelope(action, args));
test('W06/F20 SOAP binds header, route and XML namespace before returning a narrow private request', () => {
  assert.deepEqual(parse('Play', '<InstanceID>0</InstanceID><Speed>1</Speed>'), { service: 'AVTransport', kind: 'control', action: 'Play' });
  const generic = envelope('Pause').replace(/(<\/?)s:/g, '$1env:').replace('xmlns:s=', 'xmlns:env=').replace(/(<\/?)u:/g, '$1av:').replace('xmlns:u=', 'xmlns:av=');
  assert.equal(parseSoapRequest('AVTransport', header('Pause'), generic).action, 'Pause');
  for (const body of [envelope('Play'), envelope('Pause').replace(ns, ns + 'evil'), envelope('Pause').replace('<InstanceID>', '<x:InstanceID xmlns:x="urn:outside">').replace('</InstanceID>', '</x:InstanceID>')]) assert.throws(() => parseSoapRequest('AVTransport', header('Pause'), body));
  assert.throws(() => parseSoapRequest('ConnectionManager', header('Pause'), envelope('Pause')));
  for (const value of [header('Pause').slice(1, -1), header('Pause') + '\r\nInjected: x', header('Pause') + '\r\n', '\u2003' + header('Pause'), header('Pause').replace(':1#', ':2#')]) assert.throws(() => parseSoapRequest('AVTransport', value, envelope('Pause')));
});
test('W06/F20 SOAP accepts empty headers, qualified scalar arguments, XML declaration and one-time escaped metadata', () => {
  const body = '\uFEFF<?xml version="1.0" encoding="UTF-8"?>' + envelope('Pause', '<u:InstanceID>0</u:InstanceID>').replace('<s:Body>', '<s:Header/><s:Body>');
  assert.equal(parseSoapRequest('AVTransport', header('Pause'), body).action, 'Pause');
  const request = parse('SetAVTransportURI', '<InstanceID>0</InstanceID><CurrentURI>https://cdn.bilivideo.com/upgcxcode/a.mp4?x=1&amp;deadline=1800000060</CurrentURI><CurrentURIMetaData>&lt;title&gt;&amp;lt;中文&amp;gt;&lt;/title&gt;</CurrentURIMetaData>');
  assert.equal(request.kind, 'offer'); if (request.kind !== 'offer') return;
  assert.equal(request.uri, 'https://cdn.bilivideo.com/upgcxcode/a.mp4?x=1&deadline=1800000060');
  assert.equal(request.metadata, '<title>&lt;中文&gt;</title>');
  const cdata = parse('SetAVTransportURI', '<InstanceID>0</InstanceID><CurrentURI/><CurrentURIMetaData><![CDATA[<title>&not-an-entity;</title>]]></CurrentURIMetaData>');
  assert.equal(cdata.kind === 'offer' && cdata.metadata, '<title>&not-an-entity;</title>');
});
test('W06/F20 malformed, duplicate, ambiguous or executable XML cannot yield a command', () => {
  const base = envelope('Stop');
  const variants = [base.slice(0, -1), base + base, base.replace('<s:Body>', '<s:Body/><s:Body>'), base.replace('<InstanceID>0</InstanceID>', '<InstanceID>0</InstanceID><InstanceID>0</InstanceID>'), base.replace('<InstanceID>0</InstanceID>', '<InstanceID><nested>0</nested></InstanceID>'), base.replace('<s:Body>', '<s:Header><token>private</token></s:Header><s:Body>'), base.replace('<s:Body>', '<s:Body attr="x">'), base.replace('<s:Envelope ', '<s:Envelope xmlns:s="urn:evil" '), '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///private">]>' + base, base.replace('>0<', '>&entity;<'), base.replace('>0<', '>0&<'), base.replace('>0<', '>0]]><'), base.replace('<s:Body>', '<?execute script?><s:Body>'), base.replace('<s:Body>', '<!-- hidden --><s:Body>')];
  for (const body of variants) assert.throws(() => parseSoapRequest('AVTransport', header('Stop'), body));
});
test('W06/F20 XML byte, depth, node and attribute budgets are enforced before external values escape', () => {
  for (const body of [envelope('Stop', '<x>'.repeat(7) + '</x>'.repeat(7)), envelope('Stop', '<x/>'.repeat(65)), envelope('Stop').replace('<s:Envelope ', '<s:Envelope ' + Array.from({ length: 9 }, (_, i) => `x${i}="v" `).join('')), envelope('SetAVTransportURI', '<InstanceID>0</InstanceID><CurrentURI/><CurrentURIMetaData>' + '中'.repeat(1400) + '</CurrentURIMetaData>')]) assert.throws(() => parseSoapRequest('AVTransport', header('Stop'), body));
  for (const body of [new Uint8Array([0xff, 0xfe]), new Uint8Array(4097), envelope('Stop').replace('>0<', '>\u0000<'), envelope('Stop').replace('>0<', '>\ud800<'), envelope('Stop').replace('>0<', '>&#0;<'), envelope('Stop').replace('>0<', '>&#xD800;<')]) assert.throws(() => parseSoapRequest('AVTransport', header('Stop'), body));
});
test('W06/F20 SOAP validates query arguments and rejects account writes or unsupported instances', () => {
  for (const action of ['GetTransportInfo', 'GetPositionInfo', 'GetMediaInfo', 'GetDeviceCapabilities', 'GetTransportSettings', 'GetCurrentTransportActions']) assert.equal(parse(action).kind, 'query');
  for (const action of ['GetProtocolInfo', 'GetCurrentConnectionIDs']) assert.equal(parseSoapRequest('ConnectionManager', header(action, 'ConnectionManager'), envelope(action, '', 'ConnectionManager')).kind, 'query');
  for (const action of ['GetVolume', 'GetMute']) assert.equal(parseSoapRequest('RenderingControl', header(action, 'RenderingControl'), envelope(action, '<InstanceID>0</InstanceID><Channel>Master</Channel>', 'RenderingControl')).kind, 'query');
  for (const args of ['', '<InstanceID>1</InstanceID>', '<InstanceID>-1</InstanceID>', '<InstanceID>0</InstanceID><Like>1</Like>']) assert.throws(() => parse('Stop', args));
  for (const action of ['SendDanmaku', 'Like', 'LoginWithCode', 'SetMute', 'SetVolume', 'Record', 'DeleteComment']) assert.throws(() => parse(action), DomainError);
});
test('W06/F20 REL_TIME conversion is explicit in milliseconds; unsupported units and playback rates fail closed', () => {
  assert.equal(parseUpnpTime('01:02:03.12'), 3723120); assert.equal(parseUpnpTime('24:00:00'), 86400000);
  assert.deepEqual(soapControl(parse('Seek', '<InstanceID>0</InstanceID><Unit>REL_TIME</Unit><Target>00:00:05.125</Target>')), { type: 'seek', timeMs: 5125 });
  for (const target of ['-00:00:01', '00:60:00', '00:00:60', '00:00:00.0001', '24:00:01', 'NaN', '1:2:3']) assert.throws(() => parseUpnpTime(target));
  assert.throws(() => parse('Seek', '<InstanceID>0</InstanceID><Unit>TRACK_NR</Unit><Target>1</Target>'));
  assert.throws(() => parse('Play', '<InstanceID>0</InstanceID><Speed>2</Speed>'));
});
test('W06/F20 SOAP controls still need approved CastSession ownership, replay guard and remote control transfer', () => {
  const session = new CastSession(), request = parse('Pause'), command = soapControl(request);
  assert.throws(() => session.command('phone', 'lease', 1, command)); session.accept('phone', 'lease', true);
  assert.deepEqual(session.command('phone', 'lease', 1, command), { type: 'pause' });
  assert.throws(() => session.command('phone', 'lease', 1, command)); assert.throws(() => session.command('other', 'lease', 2, command));
  session.transfer('remote'); assert.throws(() => session.command('phone', 'lease', 2, command));
  assert.throws(() => soapControl(parse('GetTransportInfo'))); assert.throws(() => soapControl({ service: 'AVTransport', kind: 'control', action: 'DeleteComment' } as unknown as SoapRequest));
  assert.throws(() => soapControl({ service: 'AVTransport', kind: 'control', action: 'Seek', timeMs: NaN })); session.end();
});
const now = 1800000000000, uri = 'https://cdn.bilivideo.com/upgcxcode/00/11/video.mp4?sign=anonymous%2Fvalue&deadline=1800000120';
const offer = (value: string): SoapRequest => ({ service: 'AVTransport', kind: 'offer', action: 'SetAVTransportURI', uri: value, metadata: '' });
test('W06/F20 media-offer policy preserves signed bytes and bounds expiry without fetching, rewriting or executing metadata', () => {
  assert.deepEqual(validateSoapMediaOffer(offer(uri), now), { url: uri, metadata: '', expiresAt: now + 120000, format: 'progressive-mp4' });
  const xml = envelope('SetAVTransportURI', `<InstanceID>0</InstanceID><CurrentURI>${uri.replaceAll('&', '&amp;')}</CurrentURI><CurrentURIMetaData>&lt;script&gt;not executed&lt;/script&gt;</CurrentURIMetaData>`);
  const parsed = parseSoapRequest('AVTransport', header('SetAVTransportURI'), xml); assert.equal(validateSoapMediaOffer(parsed, now).url, uri);
  assert.equal(validateSoapMediaOffer(parsed, now).metadata, '<script>not executed</script>');
});
test('W06/F20 media offers cannot become arbitrary proxies, authenticated header requests or isolated DASH-track playback', () => {
  for (const value of [uri.replace('https:', 'http:'), uri.replace('cdn.bilivideo.com', '127.0.0.1'), uri.replace('cdn.bilivideo.com', 'bilivideo.com.evil.invalid'), uri.replace('cdn.bilivideo.com', 'cdn.bilivideo.com:8443'), uri.replace('https://', 'https://account:password@'), uri.replace('.mp4?', '.m4s?'), uri.replace('/upgcxcode/', '/arbitrary/'), uri + '#fragment', uri + '&deadline=1800000120', uri.replace('1800000120', '1800000001'), uri.replace('1800000120', '1800100000'), uri.replace('deadline=', 'ignored='), 'file:///private', 'javascript:outside()', uri + '\r\nCookie: private', uri.replace('/upgcxcode/', '\\upgcxcode\\')]) assert.throws(() => validateSoapMediaOffer(offer(value), now), DomainError);
  assert.throws(() => validateSoapMediaOffer(offer(uri), NaN)); assert.throws(() => validateSoapMediaOffer(parse('Stop'), now));
});

test('W06/F20 discovery replies describe only the empty transport and never fabricate a connected or playing state', async () => {
  const { discoverySoapReply } = await import('../../packages/cast/src/soap-probe.ts');
  for (const action of ['GetTransportInfo', 'GetPositionInfo', 'GetMediaInfo', 'GetDeviceCapabilities', 'GetTransportSettings', 'GetCurrentTransportActions']) {
    const reply = discoverySoapReply('AVTransport', header(action), envelope(action), now); assert.equal(reply.status, 200); assert.ok(reply.body.includes(action + 'Response'));
    assert.ok(!reply.body.includes('PLAYING')); assert.ok(new TextEncoder().encode(reply.body).length < 6144);
  }
  assert.match(discoverySoapReply('AVTransport', header('GetTransportInfo'), envelope('GetTransportInfo'), now).body, /NO_MEDIA_PRESENT/);
  assert.match(discoverySoapReply('AVTransport', header('GetPositionInfo'), envelope('GetPositionInfo'), now).body, /<RelCount>2147483647<\/RelCount>/);
});
test('W06/F20 discovery rejects valid media offers and controls with a fault instead of fetching or simulating playback', async () => {
  const { discoverySoapReply } = await import('../../packages/cast/src/soap-probe.ts');
  const body = envelope('SetAVTransportURI', `<InstanceID>0</InstanceID><CurrentURI>${uri.replaceAll('&', '&amp;')}</CurrentURI><CurrentURIMetaData>&lt;private-title&gt;anonymous&lt;/private-title&gt;</CurrentURIMetaData>`);
  const reply = discoverySoapReply('AVTransport', header('SetAVTransportURI'), body, now); assert.equal(reply.status, 500); assert.equal(reply.fact, 'mp4_offer_rejected'); assert.match(reply.body, /<errorCode>701<\/errorCode>/);
  assert.ok(!JSON.stringify(reply).includes('anonymous')); assert.ok(!JSON.stringify(reply).includes('deadline='));
  assert.equal(discoverySoapReply('AVTransport', header('SetAVTransportURI'), body.replace('cdn.bilivideo.com', 'outside.invalid'), now).fact, 'uri_offer_rejected');
  assert.equal(discoverySoapReply('AVTransport', header('Play'), envelope('Play', '<InstanceID>0</InstanceID><Speed>1</Speed>'), now).fact, 'play_rejected');
});
test('W06/F20 malformed, unknown and unavailable physical-volume requests produce fixed non-sensitive faults', async () => {
  const { discoverySoapReply } = await import('../../packages/cast/src/soap-probe.ts');
  assert.match(discoverySoapReply('AVTransport', header('Stop'), 'private invalid body', now).body, /<errorCode>402<\/errorCode>/);
  assert.match(discoverySoapReply('AVTransport', header('Stop'), envelope('Stop', '<InstanceID>1</InstanceID>'), now).body, /<errorCode>718<\/errorCode>/);
  assert.match(discoverySoapReply('AVTransport', header('DeleteComment'), envelope('DeleteComment'), now).body, /<errorCode>401<\/errorCode>/);
  for (const action of ['GetVolume', 'GetMute']) {
    const reply = discoverySoapReply('RenderingControl', header(action, 'RenderingControl'), envelope(action, '<InstanceID>0</InstanceID><Channel>Master</Channel>', 'RenderingControl'), now);
    assert.equal(reply.status, 500); assert.match(reply.body, /<errorCode>501<\/errorCode>/);
  }
});


test('W06/F20 diagnostic faults identify bounded parser stages and media offers without exposing external strings', async () => {
  const { discoverySoapReply } = await import('../../packages/cast/src/soap-probe.ts');
  const samples: [string, string, string][] = [
    ['', envelope('Stop'), 'invalid_header'],
    [header('Stop'), 'private-fixture-marker', 'invalid_xml'],
    [header('Stop'), envelope('Stop').replace('soap/envelope/', 'soap/outside/'), 'invalid_envelope'],
    [header('Stop'), envelope('Stop').replace('<s:Body>', '<s:Body attr="outside">'), 'invalid_body'],
    [header('Stop'), envelope('Pause'), 'invalid_action'],
    [header('Stop'), envelope('Stop', '<InstanceID>0</InstanceID><extra>private-fixture-marker</extra>'), 'invalid_arguments'],
    [header('SetAVTransportURI'), envelope('SetAVTransportURI', '<InstanceID>0</InstanceID><CurrentURI>' + 'a'.repeat(2049) + '</CurrentURI><CurrentURIMetaData/>'), 'offer_invalid_media_fields'],
    [header('SetAVTransportURI'), envelope('SetAVTransportURI', '<InstanceID>0</InstanceID><CurrentURI/>'), 'offer_invalid_arguments'],
    [header('SetAVTransportURI'), '<?xml invalid private-fixture-marker?>', 'offer_invalid_xml'],
  ];
  for (const [action, body, fact] of samples) {
    const reply = discoverySoapReply('AVTransport', action, body, now);
    assert.equal(reply.fact, fact); assert.match(reply.body, /<errorCode>402<\/errorCode>/); assert.ok(!JSON.stringify(reply).includes('private-fixture-marker'));
  }
  for (const [action, args, fact] of [['Play', '<InstanceID>0</InstanceID><Speed>1</Speed>', 'play_rejected'], ['Pause', '<InstanceID>0</InstanceID>', 'pause_rejected'], ['Stop', '<InstanceID>0</InstanceID>', 'stop_rejected'], ['Seek', '<InstanceID>0</InstanceID><Unit>REL_TIME</Unit><Target>00:00:05</Target>', 'seek_rejected']]) assert.equal(discoverySoapReply('AVTransport', header(action!), envelope(action!, args), now).fact, fact);
});
test('W06/F20 XML standalone declarations are accepted without accepting DTD, malformed declarations or extra encodings', () => {
  for (const declaration of ['<?xml version="1.0" standalone="yes"?>', "<?xml version='1.0' encoding='utf-8' standalone='no'?>"]) assert.equal(parseSoapRequest('AVTransport', header('Stop'), declaration + envelope('Stop')).action, 'Stop');
  for (const declaration of ['<?xml version="1.0" standalone="YES"?>', '<?xml version="1.0" encoding="UTF-16"?>', '<?XML version="1.0"?>', '<?xml version="1.0" standalone="yes" encoding="UTF-8"?>', '<?xml version="1.0" standalone="yes"?><!DOCTYPE x>']) assert.throws(() => parseSoapRequest('AVTransport', header('Stop'), declaration + envelope('Stop')));
});


test('W06/F20 offer structure inspection classifies missing, extra, duplicate, typed, nested and foreign fields without relaxing acceptance', async () => {
  const { inspectSoapOffer } = await import('../../packages/cast/src/soap.ts');
  const args = `<InstanceID>0</InstanceID><CurrentURI>${uri.replaceAll('&', '&amp;')}</CurrentURI><CurrentURIMetaData/>`;
  const variants: [string, string][] = [
    [args.replace('<InstanceID>0</InstanceID>', ''), 'offer_args_missing_instance'],
    [args.replace(/<CurrentURI>.*?<\/CurrentURI>/, ''), 'offer_args_missing_uri'],
    [args.replace('<CurrentURIMetaData/>', ''), 'offer_args_missing_metadata'],
    [args + '<private_field>private-fixture-marker</private_field>', 'offer_args_extra'],
    [args + '<InstanceID>0</InstanceID>', 'offer_args_duplicate'],
    [args.replace('<CurrentURI>', '<CurrentURI type="private-fixture-marker">'), 'offer_args_attributes'],
    [args.replace('<CurrentURIMetaData/>', '<CurrentURIMetaData><private_field>private-fixture-marker</private_field></CurrentURIMetaData>'), 'offer_args_nested'],
    [args.replace('<CurrentURI>', '<CurrentURI xmlns="urn:private-fixture-marker">'), 'offer_args_namespace'],
  ];
  for (const [value, fact] of variants) {
    const raw = envelope('SetAVTransportURI', value), facts = inspectSoapOffer('AVTransport', header('SetAVTransportURI'), raw, now);
    assert.ok(facts.includes(fact as typeof facts[number])); assert.ok(!JSON.stringify(facts).includes('private-fixture-marker'));
    assert.throws(() => parseSoapRequest('AVTransport', header('SetAVTransportURI'), raw));
  }
  assert.ok(inspectSoapOffer('AVTransport', header('SetAVTransportURI'), envelope('SetAVTransportURI', args), now).includes('offer_args_ok'));
});
test('W06/F20 offer URI diagnostics cover the complete fixed destination, format and expiry policy without exposing or fetching a URI', async () => {
  const { inspectSoapOffer } = await import('../../packages/cast/src/soap.ts');
  const variants: [string, string][] = [[uri, 'offer_uri_supported'], ['', 'offer_uri_malformed'], [uri.replace('https:', 'http:'), 'offer_uri_http'], ['file:///private-fixture-marker', 'offer_uri_scheme'], [uri.replace('cdn.bilivideo.com', 'outside.invalid'), 'offer_uri_destination'], [uri.replace('/upgcxcode/', '/outside/'), 'offer_uri_path'], [uri.replace('.mp4?', '.m4s?'), 'offer_uri_m4s'], [uri.replace('.mp4?', '.m3u8?'), 'offer_uri_m3u8'], [uri.replace('.mp4?', '.flv?'), 'offer_uri_other_format'], [uri.replace('deadline=', 'ignored='), 'offer_uri_deadline_missing'], [uri + '&deadline=1800000120', 'offer_uri_deadline_invalid'], [uri.replace('1800000120', '1800000001'), 'offer_uri_deadline_unusable']];
  for (const [value, expected] of variants) {
    const raw = envelope('SetAVTransportURI', `<InstanceID>0</InstanceID><CurrentURI>${value.replaceAll('&', '&amp;')}</CurrentURI><CurrentURIMetaData/>`);
    const facts = inspectSoapOffer('AVTransport', header('SetAVTransportURI'), raw, now);
    assert.ok(facts.includes(expected as typeof facts[number])); assert.ok(!JSON.stringify(facts).includes('deadline='));
    const parsed = parseSoapRequest('AVTransport', header('SetAVTransportURI'), raw);
    if (expected === 'offer_uri_supported') assert.equal(validateSoapMediaOffer(parsed, now).url, value);
    else assert.throws(() => validateSoapMediaOffer(parsed, now));
  }
  const missing = envelope('SetAVTransportURI', '<InstanceID>0</InstanceID><CurrentURIMetaData/>');
  assert.ok(inspectSoapOffer('AVTransport', header('SetAVTransportURI'), missing, now).includes('offer_uri_missing'));
  const nested = envelope('SetAVTransportURI', '<InstanceID>0</InstanceID><CurrentURI><node/></CurrentURI><CurrentURIMetaData/>');
  assert.ok(inspectSoapOffer('AVTransport', header('SetAVTransportURI'), nested, now).includes('offer_uri_ambiguous'));
});
test('W06/F20 rejected metadata is classified only as empty, text, nested or oversized, never interpreted or returned', async () => {
  const { inspectSoapOffer } = await import('../../packages/cast/src/soap.ts');
  for (const [metadata, fact] of [['', 'offer_metadata_empty'], ['&lt;script&gt;private-fixture-marker&lt;/script&gt;', 'offer_metadata_text'], ['<DIDL-Lite><title>private-fixture-marker</title></DIDL-Lite>', 'offer_metadata_nested'], ['a'.repeat(2049), 'offer_metadata_oversized']]) {
    const raw = envelope('SetAVTransportURI', `<InstanceID>0</InstanceID><CurrentURI/><CurrentURIMetaData>${metadata}</CurrentURIMetaData>`);
    const facts = inspectSoapOffer('AVTransport', header('SetAVTransportURI'), raw, now);
    assert.ok(facts.includes(fact as typeof facts[number])); assert.ok(!JSON.stringify(facts).includes('private-fixture-marker'));
  }
});
test('W06/F20 structural inspection shares the original bounded envelope gate and yields nothing for another action or malformed XML', async () => {
  const { inspectSoapOffer } = await import('../../packages/cast/src/soap.ts');
  for (const raw of ['private-fixture-marker', '<!DOCTYPE x>' + envelope('SetAVTransportURI'), new Uint8Array(4097), envelope('Pause'), envelope('SetAVTransportURI').replace(ns, 'urn:outside')]) assert.deepEqual(inspectSoapOffer('AVTransport', header('SetAVTransportURI'), raw, now), []);
  assert.deepEqual(inspectSoapOffer('AVTransport', header('Play'), envelope('Play'), now), []);
  assert.deepEqual(inspectSoapOffer('RenderingControl', header('SetAVTransportURI'), envelope('SetAVTransportURI'), now), []);
});


test('W01/F20 probe compatibility ignores only bounded scalar extensions and opaque metadata while the general parser stays strict', async () => {
  const { parseSoapProbeRequest } = await import('../../packages/cast/src/soap.ts');
  const args = `<InstanceID>0</InstanceID><CurrentURI>${uri.replaceAll('&', '&amp;')}</CurrentURI><CurrentURIMetaData>${'a'.repeat(2200)}</CurrentURIMetaData><private_extension>private-fixture-marker</private_extension>`;
  const raw = envelope('SetAVTransportURI', args), request = parseSoapProbeRequest('AVTransport', header('SetAVTransportURI'), raw);
  assert.deepEqual(request, { service: 'AVTransport', kind: 'offer', action: 'SetAVTransportURI', uri, metadata: '' });
  assert.throws(() => parseSoapRequest('AVTransport', header('SetAVTransportURI'), raw));
  assert.ok(!JSON.stringify(request).includes('private-fixture-marker'));
  for (const replacement of ['', '<CurrentURIMetaData><nested/></CurrentURIMetaData>']) assert.throws(() => parseSoapProbeRequest('AVTransport', header('SetAVTransportURI'), envelope('SetAVTransportURI', args.replace(/<CurrentURIMetaData>.*?<\/CurrentURIMetaData>/, replacement))));
  for (const extension of ['<private_extension/>', '<x xmlns="urn:outside"/>', '<x type="string"/>', '<x><nested/></x>', '<a/><b/><c/><d/><e/><f/>']) assert.throws(() => parseSoapProbeRequest('AVTransport', header('SetAVTransportURI'), envelope('SetAVTransportURI', args + extension)));
  assert.throws(() => parseSoapProbeRequest('AVTransport', header('Pause'), envelope('Pause', '<InstanceID>0</InstanceID><extra/>')));
});
test('W01/F20 HTTP sender URI creates only an HTTPS test candidate with identical authority/path/query bytes and no HTTP fallback', async () => {
  const { parseSoapProbeRequest, planSoapMediaProbe } = await import('../../packages/cast/src/soap.ts');
  const original = uri.replace('https:', 'http:') + '&sign=private-fixture-marker';
  const request = parseSoapProbeRequest('AVTransport', header('SetAVTransportURI'), envelope('SetAVTransportURI', `<InstanceID>0</InstanceID><CurrentURI>${original.replaceAll('&', '&amp;')}</CurrentURI><CurrentURIMetaData/>`));
  const candidate = planSoapMediaProbe(request, now); assert.equal(candidate.upgraded, true); assert.equal(candidate.url, original.replace(/^http:/, 'https:')); assert.equal(candidate.metadata, '');
  assert.equal(planSoapMediaProbe(offer(uri), now).upgraded, false);
  for (const value of [original.replace('cdn.bilivideo.com', '127.0.0.1'), original.replace('cdn.bilivideo.com', 'cdn.bilivideo.com.evil.invalid'), original.replace('.mp4?', '.m4s?'), original.replace('1800000120', '1800000001'), original.replace('http://', 'http://user:secret@'), original + '#fragment']) assert.throws(() => planSoapMediaProbe(offer(value), now));
  assert.throws(() => planSoapMediaProbe(parse('Stop'), now));
});
test('W01/F20 source result IPC is fixed, canonical and cannot contain a URL or raw network response', async () => {
  const { parseCastProbeResult } = await import('../../packages/contracts/src/cast-probe.ts');
  const frame = { version: 1, operation: 'cast-discovery', scope: { accountId: 'guest', generation: 1, mediaSessionId: 'cast-discovery', requestId: 'r1' }, closed: false };
  for (const code of ['cast.source_candidate_valid', 'cast.source_upgrade_planned', 'cast.source_started', 'cast.source_pass', 'cast.source_invalid_request', 'cast.source_invalid_media', 'cast.source_failed_403_0', 'cast.source_failed_0_60']) assert.equal(parseCastProbeResult({ ...frame, code }).code, code);
  for (const code of ['cast.source_failed_999_0', 'cast.source_failed_200_060', 'cast.source_failed_0_1000', 'cast.source_https://outside.invalid', 'cast.source_private-fixture-marker']) assert.throws(() => parseCastProbeResult({ ...frame, code }));
});
test('W01/F20 compact report preserves source failure, fixed SOAP summary and latest actionable failure under later polling', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const { soapProbeSummary } = await import('../../packages/contracts/src/upnp.ts');
  const source = { verdict: 'FAIL', code: 'cast.source_failed_0_60' }, summary = { verdict: 'UNVERIFIED', code: soapProbeSummary(['cast.soap_offer_args_extra'])! }, issue = { verdict: 'FAIL', code: 'cast.cleanup_unknown_restart_required' };
  const selected = diagnosticEntries([source, summary, issue, ...Array.from({ length: 12 }, (_, i) => ({ verdict: 'UNVERIFIED', code: 'cast.poll_' + i }))]);
  assert.equal(selected.length, 8); for (const value of [source, summary, issue]) assert.ok(selected.includes(value));
});


test('W01/F20 HTTPS-candidate policy reasons are complete even when the original URI was HTTP and no network test is eligible', async () => {
  const { inspectSoapProbeCandidate } = await import('../../packages/cast/src/soap.ts');
  for (const [value, reason] of [[uri.replace('https:', 'http:'), 'supported'], [uri.replace('cdn.bilivideo.com', 'outside.invalid').replace('https:', 'http:'), 'destination'], [uri.replace('.mp4?', '.m4s?').replace('https:', 'http:'), 'm4s'], [uri.replace('deadline=', 'ignored=').replace('https:', 'http:'), 'deadline_missing']]) assert.equal(inspectSoapProbeCandidate(offer(value!), now), reason);
  assert.equal(inspectSoapProbeCandidate(parse('Stop'), now), undefined);
  const { SOURCE_POLICY_REASONS } = await import('../../packages/contracts/src/upnp.ts');
  const { parseCastProbeResult } = await import('../../packages/contracts/src/cast-probe.ts');
  for (const reason of SOURCE_POLICY_REASONS) assert.equal(parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope: { accountId: 'guest', generation: 1, mediaSessionId: 'cast-discovery', requestId: 'r1' }, closed: false, code: 'cast.source_policy_' + reason }).code, 'cast.source_policy_' + reason);
});

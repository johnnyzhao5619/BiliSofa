"""Validate the isolated .15 live relay candidate, not device playback."""
from pathlib import Path
import hashlib,json,zipfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1];digest=lambda data:hashlib.sha256(data).hexdigest()
package=ROOT/'dist/BiliSofa-W01-network-unsigned.wgt'
with zipfile.ZipFile(package) as z:
 names=set(z.namelist());b=json.loads(z.read('build.json'));source=json.loads((ROOT/'dist/source-manifest.json').read_text())
 if len(names)!=len(z.namelist()) or names!=set(b['files'])|{'build.json'}:raise SystemExit('Live archive content mismatch')
 if b['version']!='0.0.16' or b['identity']!='BiliNet001.Probe' or b['automation']!='public-live-relay-auto-once' or b['authenticatedUse']!='not-included' or b['sourceHash']!=source['sourceHash']:raise SystemExit('Live identity mismatch')
 for n,h in source['files'].items():
  if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Live source changed since build')
 for n,h in b['files'].items():
  if n.startswith('/') or '..' in Path(n).parts or Path(n).suffix in {'.pem','.p12','.key','.ts','.map'} or digest(z.read(n))!=h:raise SystemExit('Live content unsafe or changed')
  data=z.read(n)
  if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data or b'SESSDATA=' in data or b'bili_jct=' in data:raise SystemExit('Live private pattern')
 if any('account' in n or 'progress-post' in n or 'cast-worker' in n or 'session-worker' in n or 'qr' in n for n in names):raise SystemExit('Live package contains unrelated capabilities')
 xml=ET.fromstring(z.read('config.xml'));ns={'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'};app=xml.find('t:application',ns)
 if app.attrib['id']!='BiliNet001.Probe' or app.attrib['package']!='BiliNet001' or xml.attrib['version']!=b['version'] or xml.find('w:content',ns).attrib['src']!='index.html':raise SystemExit('Live config identity mismatch')
 if {v.attrib['name'] for v in xml.findall('t:privilege',ns)}!={'http://tizen.org/privilege/internet','http://developer.samsung.com/privilege/productinfo'}:raise SystemExit('Live privilege mismatch')
 if {(v.attrib['origin'],v.attrib.get('subdomains')) for v in xml.findall('w:access',ns)}!={('http://127.0.0.1:40323','false'),('http://127.0.0.1:40324','false'),('http://127.0.0.1:40325','false')}:raise SystemExit('Live destination config mismatch')
 html=z.read('index.html').decode()
 if b['sourceHash'] not in html or 'content="live"' not in html or "media-src 'self' http://127.0.0.1:40325;" not in html or "script-src 'self' 'wasm-unsafe-eval' file://wgt-widget/" not in html:raise SystemExit('Live CSP/source mismatch')
 if 'content="once"' not in html or "connect-src 'self' http://127.0.0.1:40323 http://127.0.0.1:40324 http://127.0.0.1:40325;" not in html:raise SystemExit('Live local networking/automation mismatch')
 live=json.loads((ROOT/'build/live-relay-candidate/manifest.json').read_text());candidate=json.loads((ROOT/'build/network-candidate/manifest.json').read_text());libraries=json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text())
 if live['libraryBuild']!=libraries or candidate['libraryBuild']!=libraries or b['liveManifestSha256']!=digest((ROOT/'build/live-relay-candidate/manifest.json').read_bytes()):raise SystemExit('Live library provenance mismatch')
 for n,h in candidate['sourceInputs'].items():
  if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Live reporter source changed')
 for n,h in live['sourceInputs'].items():
  if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Live source input changed')
 for prefix,manifest in [('live',live),('native',candidate)]:
  for n in ['probe.js','probe.wasm','probe.data']:
   expected=manifest['files'][n] if prefix=='live' else manifest['outputs']['probe/'+n]
   if digest(z.read(prefix+'/'+n))!=expected:raise SystemExit('Live WASM mismatch')
  if z.read(prefix+'/probe.wasm')[:8]!=b'\0asm\1\0\0\0':raise SystemExit('Live WASM magic mismatch')
 if digest(z.read('live/probe.data'))!='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505':raise SystemExit('Live CA mismatch')
 for export in ['_live_begin','_live_stop','_live_response_clear','_live_relay_start','_live_relay_reply','_live_relay_segment']:
  if export not in z.read('live/probe.js').decode():raise SystemExit('Live export missing')
 for n,h in candidate['licenses'].items():
  if digest(z.read('third-party-licenses/'+n))!=h:raise SystemExit('Live license mismatch')
 if package.with_suffix('.wgt.sha256').read_text().split()[0]!=digest(package.read_bytes()):raise SystemExit('Live archive hash mismatch')
print('Isolated live WGT identity/integrity/provenance PASS; TV/SDK networking UNVERIFIED')

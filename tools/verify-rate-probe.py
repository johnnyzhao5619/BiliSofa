"""Verify isolated rate candidate contents/provenance; no device claims."""
from pathlib import Path
import json,hashlib,zipfile,xml.etree.ElementTree as ET,subprocess
ROOT=Path(__file__).resolve().parents[1]
def digest(v):return hashlib.sha256(v).hexdigest()
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
package=ROOT/'dist/BiliSofa-W01-network-unsigned.wgt'
with zipfile.ZipFile(package) as z:
 b=json.loads(z.read('build.json'));names=set(z.namelist());source=json.loads((ROOT/'dist/source-manifest.json').read_text());candidate=json.loads((ROOT/'build/network-candidate/manifest.json').read_text())
 expected={'app.js','index.html','config.xml','build.json','probe-worker.js','guest-video-worker.js','probe.css','icon.png','LICENSE','THIRD_PARTY_NOTICES.md','native/manifest.json','native/probe.js','native/probe.wasm','native/probe.data'}|{'third-party-licenses/'+n for n in candidate['licenses']}
 if len(names)!=len(z.namelist()) or names!=expected or names!=set(b['files'])|{'build.json'}:raise SystemExit('Rate content mismatch')
 if b['version']!='0.0.17' or b['identity']!='BiliNet001.Probe' or b['automation']!='public-vod-rate-manual' or b['authenticatedUse']!='not-included' or b['sourceHash']!=source['sourceHash']:raise SystemExit('Rate build identity mismatch')
 for n,h in source['files'].items():
  if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Rate source snapshot stale')
 for n,h in b['files'].items():
  data=z.read(n)
  if n.startswith('/') or '..' in Path(n).parts or Path(n).suffix in {'.pem','.p12','.key','.ts','.map'} or digest(data)!=h:raise SystemExit('Rate unsafe or modified content')
  if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data or b'SESSDATA=' in data or b'bili_jct=' in data:raise SystemExit('Rate private pattern')
 xml=ET.fromstring(z.read('config.xml'));ns={'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'};app=xml.find('t:application',ns)
 if app.attrib['id']!=b['identity'] or app.attrib['package']!='BiliNet001' or xml.attrib['version']!=b['version'] or xml.find('w:content',ns).attrib['src']!='index.html':raise SystemExit('Rate config mismatch')
 if {v.attrib['name'] for v in xml.findall('t:privilege',ns)}!={'http://tizen.org/privilege/internet','http://developer.samsung.com/privilege/productinfo'}:raise SystemExit('Rate privilege mismatch')
 if {(v.attrib['origin'],v.attrib.get('subdomains')) for v in xml.findall('w:access',ns)}!={('http://127.0.0.1:40323','false'),('http://127.0.0.1:40324','false')}:raise SystemExit('Rate access mismatch')
 html=z.read('index.html').decode()
 if b['sourceHash'] not in html or '<meta name="network-mode" content="rate">' not in html or 'live-auto' in html or '<meta name="probe-auto" content="0">' not in html or "media-src 'self' http://127.0.0.1:40323 http://127.0.0.1:40324;" not in html:raise SystemExit('Rate HTML/CSP mismatch')
 if "script-src 'self' 'wasm-unsafe-eval' file://wgt-widget/" not in html:raise SystemExit('Rate script policy mismatch')
 if b['dependencies']!=candidate['dependencies'] or candidate['libraryBuild']!=json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text()) or b['candidateManifestSha256']!=digest((ROOT/'build/network-candidate/manifest.json').read_bytes()):raise SystemExit('Rate library provenance mismatch')
 for n,h in candidate['sourceInputs'].items():
  if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Rate native input changed')
 for n in ['probe.js','probe.wasm','probe.data']:
  if digest(z.read('native/'+n))!=candidate['outputs']['probe/'+n]:raise SystemExit('Rate native output mismatch')
 if z.read('native/probe.wasm')[:8]!=b'\0asm\1\0\0\0':raise SystemExit('Rate WASM invalid')
 runtime=json.loads(z.read('native/manifest.json'))
 if runtime['files']!={n:digest(z.read('native/'+n)) for n in ['probe.js','probe.wasm','probe.data']}:raise SystemExit('Rate native runtime manifest mismatch')
 for n,h in candidate['licenses'].items():
  if digest(z.read('third-party-licenses/'+n))!=h:raise SystemExit('Rate license mismatch')
 if package.with_suffix('.wgt.sha256').read_text().split()[0]!=digest(package.read_bytes()):raise SystemExit('Rate archive hash mismatch')
print('Isolated rate WGT identity/integrity/provenance PASS; TV rate/audio UNVERIFIED')

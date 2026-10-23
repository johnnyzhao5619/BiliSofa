"""Separate actual-watch candidate; integrity is not account-write authorization."""
from pathlib import Path
import json,hashlib,zipfile,xml.etree.ElementTree as ET,subprocess
ROOT=Path(__file__).resolve().parents[1]
def digest(v):return hashlib.sha256(v).hexdigest()
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
package=ROOT/'dist/BiliSofa-W01-network-unsigned.wgt'
with zipfile.ZipFile(package) as z:
 b=json.loads(z.read('build.json'));names=set(z.namelist());source=json.loads((ROOT/'dist/source-manifest.json').read_text());candidate=json.loads((ROOT/'build/network-candidate/manifest.json').read_text());observed=json.loads((ROOT/'build/observed-progress-candidate/manifest.json').read_text())
 prefixes=['native','account','account-readback','observed-progress-post']
 expected={'app.js','index.html','config.xml','build.json','probe-worker.js','guest-video-worker.js','account-worker.js','account-readback-worker.js','observed-progress-worker.js','probe.css','icon.png','LICENSE','THIRD_PARTY_NOTICES.md','third-party-licenses/qrcode-generator-MIT.txt'}|{'third-party-licenses/'+n for n in candidate['licenses']}|{prefix+'/'+n for prefix in prefixes for n in ['manifest.json','probe.js','probe.wasm','probe.data']}
 if len(names)!=len(z.namelist()) or names!=expected or names!=set(b['files'])|{'build.json'}:raise SystemExit('Observed content mismatch')
 if b['version']!='0.0.18' or b['identity']!='BiliNet001.Probe' or b['automation']!='account-observed-progress-manual' or b['authenticatedUse']!='requires-new-explicit-authorization' or b['sourceHash']!=source['sourceHash']:raise SystemExit('Observed identity mismatch')
 for n,h in source['files'].items():
  if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Observed source snapshot stale')
 for n,h in b['files'].items():
  data=z.read(n)
  if n.startswith('/') or '..' in Path(n).parts or Path(n).suffix in {'.pem','.p12','.key','.ts','.map'} or digest(data)!=h:raise SystemExit('Observed unsafe content')
  if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data or b'SESSDATA=' in data or b'bili_jct=' in data:raise SystemExit('Observed private pattern')
 xml=ET.fromstring(z.read('config.xml'));ns={'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'};app=xml.find('t:application',ns)
 if app.attrib['id']!=b['identity'] or app.attrib['package']!='BiliNet001' or xml.attrib['version']!=b['version'] or xml.find('w:content',ns).attrib['src']!='index.html':raise SystemExit('Observed config mismatch')
 if {v.attrib['name'] for v in xml.findall('t:privilege',ns)}!={'http://tizen.org/privilege/internet','http://developer.samsung.com/privilege/productinfo'}:raise SystemExit('Observed privilege mismatch')
 if {(v.attrib['origin'],v.attrib.get('subdomains')) for v in xml.findall('w:access',ns)}!={('http://127.0.0.1:40323','false'),('http://127.0.0.1:40324','false')}:raise SystemExit('Observed access mismatch')
 html=z.read('index.html').decode()
 if b['sourceHash'] not in html or '<meta name="network-mode" content="observed-progress">' not in html or '<meta name="probe-auto" content="0">' not in html or 'id="ack-prior"' not in html or 'id="confirm-progress" data-focus-id="confirm-progress" disabled' not in html:raise SystemExit('Observed consent/automation mismatch')
 if "script-src 'self' 'wasm-unsafe-eval' file://wgt-widget/" not in html or "media-src 'self' http://127.0.0.1:40323 http://127.0.0.1:40324;" not in html:raise SystemExit('Observed CSP mismatch')
 libraries=json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text())
 if candidate['libraryBuild']!=libraries or observed['libraryBuild']!=libraries or b['candidateManifestSha256']!=digest((ROOT/'build/network-candidate/manifest.json').read_bytes()) or b['observedManifestSha256']!=digest((ROOT/'build/observed-progress-candidate/manifest.json').read_bytes()) or b['dependencies']!=candidate['dependencies']:raise SystemExit('Observed provenance mismatch')
 for m in [candidate,observed]:
  for n,h in m['sourceInputs'].items():
   if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Observed native source changed')
 for prefix,kind in [('native','probe'),('account','account'),('account-readback','account-readback'),('observed-progress-post','observed-progress')]:
  hashes={n:observed['files'][n] if kind=='observed-progress' else candidate['outputs'][kind+'/'+n] for n in ['probe.js','probe.wasm','probe.data']}
  if json.loads(z.read(prefix+'/manifest.json'))['files']!=hashes:raise SystemExit('Observed runtime manifest mismatch')
  for n,h in hashes.items():
   if digest(z.read(prefix+'/'+n))!=h:raise SystemExit('Observed runtime digest mismatch')
  if z.read(prefix+'/probe.wasm')[:8]!=b'\0asm\1\0\0\0':raise SystemExit('Observed WASM magic mismatch')
 for n,h in candidate['licenses'].items():
  if digest(z.read('third-party-licenses/'+n))!=h:raise SystemExit('Observed license mismatch')
 if b['qrDependency']!=json.loads((ROOT/'platform/third-party/qrcode-generator.lock.json').read_text()) or digest(z.read('third-party-licenses/qrcode-generator-MIT.txt'))!='3a850fa5f08101db6f40676c2786e10bd2cd5fff7b12ffdf1e0c434d4e49d90c':raise SystemExit('Observed QR provenance mismatch')
 for export in ['_progress_prepare','_progress_attempt','_auth_stop','_auth_import_cookies']:
  if export not in z.read('observed-progress-post/probe.js').decode():raise SystemExit('Observed export absent')
 if package.with_suffix('.wgt.sha256').read_text().split()[0]!=digest(package.read_bytes()):raise SystemExit('Observed package digest mismatch')
print('Observed progress WGT identity/integrity/provenance PASS; new real POST NOT AUTHORIZED')

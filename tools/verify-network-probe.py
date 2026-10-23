"""Strict isolated network WGT identity, contents and provenance checks."""
from pathlib import Path
import hashlib, json, zipfile, xml.etree.ElementTree as ET, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
with zipfile.ZipFile(ROOT/'dist/BiliSofa-W01-network-unsigned.wgt') as initial:
 if json.loads(initial.read('build.json'))['version']=='0.0.18':
  raise SystemExit(subprocess.run([sys.executable,str(ROOT/'tools/verify-observed-progress.py')]).returncode)
 if json.loads(initial.read('build.json'))['version']=='0.0.17':
  raise SystemExit(subprocess.run([sys.executable,str(ROOT/'tools/verify-rate-probe.py')]).returncode)
 if json.loads(initial.read('build.json'))['version'] in ['0.0.14','0.0.15','0.0.16']:
  raise SystemExit(subprocess.run([sys.executable,str(ROOT/'tools/verify-live-probe.py')]).returncode)
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
package=ROOT/'dist/BiliSofa-W01-network-unsigned.wgt'
def digest(value): return hashlib.sha256(value).hexdigest()
with zipfile.ZipFile(package) as z:
 names=set(z.namelist()); b=json.loads(z.read('build.json'))
 if len(names)!=len(z.namelist()) or names!=set(b['files'])|{'build.json'}: raise SystemExit('Network package content mismatch')
 if any(n.startswith('/') or '..' in Path(n).parts or Path(n).suffix in {'.pem','.p12','.key','.ts','.map'} for n in names): raise SystemExit('Network package unsafe file')
 for n,h in b['files'].items():
  if digest(z.read(n))!=h: raise SystemExit('Network bundled digest mismatch')
 xml=ET.fromstring(z.read('config.xml'));ns={'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'};app=xml.find('t:application',ns)
 if app.attrib.get('id')!='BiliNet001.Probe' or app.attrib.get('package')!='BiliNet001' or xml.attrib['version']!=b['version'] or b['version'] not in ['0.0.5','0.0.6','0.0.7','0.0.8','0.0.9','0.0.10','0.0.11','0.0.12','0.0.13']: raise SystemExit('Network candidate identity mismatch')
 if xml.find('w:content',ns).attrib['src']!='index.html': raise SystemExit('Network entrypoint mismatch')
 if {x.attrib.get('name') for x in xml.findall('t:privilege',ns)}!={'http://tizen.org/privilege/internet','http://developer.samsung.com/privilege/productinfo'}: raise SystemExit('Network privilege mismatch')
 expected_mode='account-reconcile-compare' if b['version']=='0.0.13' else 'account-reconcile' if b['version']=='0.0.12' else 'account-progress' if b['version']=='0.0.11' else 'account' if b['version'] in ['0.0.8','0.0.9','0.0.10'] else 'https-session' if b['version']=='0.0.7' else 'session' if b['version']=='0.0.5' else 'tls'
 if b.get('identity')!='BiliNet001.Probe' or b.get('automation')!=('account-progress-reconcile-readonly-manual' if expected_mode in ['account-reconcile','account-reconcile-compare'] else 'account-progress-preview-manual' if expected_mode=='account-progress' else 'account-readonly-manual' if expected_mode=='account' else 'network-https-session-validation-once' if expected_mode=='https-session' else 'network-session-validation-once' if expected_mode=='session' else 'network-tls-validation-once') or b.get('authenticatedUse')!='UNVERIFIED' or ('<meta name="network-mode" content="'+expected_mode+'">') not in z.read('index.html').decode(): raise SystemExit('Network automation/credential mismatch')
 source=json.loads((ROOT/'dist/source-manifest.json').read_text());candidate=json.loads((ROOT/'build/network-candidate/manifest.json').read_text())
 if candidate['libraryBuild']!=json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text()): raise SystemExit('Network linked libraries are stale')
 if b['sourceHash']!=source['sourceHash'] or b['sourceHash'] not in z.read('index.html').decode(): raise SystemExit('Network source snapshot mismatch')
 if b['candidateManifestSha256']!=digest((ROOT/'build/network-candidate/manifest.json').read_bytes()) or b['dependencies']!=candidate['dependencies']: raise SystemExit('Network dependency provenance mismatch')
 for n,h in candidate['sourceInputs'].items():
  if digest((ROOT/n).read_bytes())!=h: raise SystemExit('Network candidate C input changed')
 for kind,prefix in [('probe','native'),('validation','validation'),('https-session','https-session')] + ([('account','account')] if expected_mode in ['account','account-progress','account-reconcile','account-reconcile-compare'] else []) + ([('progress-post','progress-post')] if expected_mode=='account-progress' else []) + ([('account-readback','account-readback')] if expected_mode=='account-reconcile-compare' else []):
  for n in ['probe.js','probe.wasm'] + ([] if kind == 'https-session' else ['probe.data']):
   if digest(z.read(prefix+'/'+n))!=candidate['outputs'][kind+'/'+n]: raise SystemExit('Network final WASM mismatch')
  if z.read(prefix+'/probe.wasm')[:8]!=b'\0asm\1\0\0\0': raise SystemExit('Network WASM magic mismatch')
 if digest(z.read('validation/probe.data'))!='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505': raise SystemExit('Network CA mismatch')
 if expected_mode in ['account','account-progress','account-reconcile','account-reconcile-compare']:
  if b.get('qrDependency')!=json.loads((ROOT/'platform/third-party/qrcode-generator.lock.json').read_text()): raise SystemExit('QR provenance mismatch')
  for export in ['_auth_begin','_auth_stop','_auth_import_cookies','_auth_export_cookies','_auth_cookie_clear','_auth_response_clear']:
   if export not in z.read('account/probe.js').decode(): raise SystemExit('Account scoped export missing')
  if digest(z.read('account/probe.data'))!='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505': raise SystemExit('Account CA mismatch')
  if digest(z.read('third-party-licenses/qrcode-generator-MIT.txt'))!='3a850fa5f08101db6f40676c2786e10bd2cd5fff7b12ffdf1e0c434d4e49d90c': raise SystemExit('QR license mismatch')
 if expected_mode=='account-progress':
  if '_progress_prepare' not in z.read('progress-post/probe.js').decode() or '_progress_attempt' not in z.read('progress-post/probe.js').decode(): raise SystemExit('Progress scoped exports missing')
  if digest(z.read('progress-post/probe.data'))!='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505': raise SystemExit('Progress CA mismatch')
 if expected_mode in ['account-reconcile','account-reconcile-compare'] and ('progress-worker.js' in names or any(n.startswith('progress-post/') for n in names) or b'id="confirm-progress"' in z.read('index.html')): raise SystemExit('Read-only reconciliation includes write capability')
 if expected_mode=='account-reconcile-compare' and ('account-readback-worker.js' not in names or '_auth_readback_prepare' not in z.read('account-readback/probe.js').decode()): raise SystemExit('Readback comparison module missing')
 if '_https_session_stop' not in z.read('https-session/probe.js').decode(): raise SystemExit('HTTPS session stop export missing')
 if '_network_validation_stop' not in z.read('validation/probe.js').decode(): raise SystemExit('Network stop export missing')
 for n in names:
  data=z.read(n)
  if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data or b'SESSDATA=' in data or b'bili_jct=' in data: raise SystemExit('Private data in network package')
 if "script-src 'self' 'wasm-unsafe-eval' file://wgt-widget/" not in z.read('index.html').decode(): raise SystemExit('Network CSP mismatch')
 if package.with_suffix('.wgt.sha256').read_text().split()[0]!=digest(package.read_bytes()): raise SystemExit('Network archive digest mismatch')
print('Separate network WGT integrity/provenance passed; no TV or credential approval')

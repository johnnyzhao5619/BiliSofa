"""Explicit W01 collection from the single authorized TV's fixed nonsecret /report.
Uses private target/signing metadata; never scans, redirects, proxies or reads account data.
"""
from pathlib import Path
import argparse, datetime, ipaddress, json, os, socket, subprocess, sys, time
import urllib.request, urllib.error
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('action',choices=['collect'])
parser.add_argument('--variant',choices=['native','isolation','network'],default='native')
parser.add_argument('--wait-seconds',type=int,choices=range(1,181),default=45,metavar='1..180')
args=parser.parse_args()
private=Path(os.environ.get('BILISOFA_PRIVATE_DIR',str(Path.home()/'.local/share/BiliSofa'))).resolve()
if private.is_relative_to(root): raise SystemExit('Private device target must be outside repository')
try:
 target=json.loads((private/'current-tv-target.json').read_text())
 expected_path=private/f'deployed-{args.variant}-manifest.json'
 if not expected_path.exists(): expected_path=private/f'signed-{args.variant}-manifest.json'
 expected=json.loads(expected_path.read_text())
 address=ipaddress.ip_address(target['serial'].rsplit(':',1)[0])
 if address.version!=4 or not address.is_private or address.is_loopback or address.is_unspecified or address.is_multicast: raise ValueError()
except (OSError,ValueError,KeyError): raise SystemExit('BLOCKED private.target_or_expected_build_missing')
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs): return None
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
url=f'http://{address}:40322/report'
validator="import fs from 'node:fs'; import {parseDiagnosticReport} from './packages/contracts/src/index.ts'; try {process.stdout.write(parseDiagnosticReport(fs.readFileSync(0,'utf8')));} catch {process.exit(2);}"
deadline=time.monotonic()+args.wait_seconds
report=None
while time.monotonic()<deadline:
 try:
  with opener.open(url,timeout=1) as response:
   if response.status!=200: raise ValueError()
   data=response.read(4097)
   if len(data)>4096: raise ValueError()
  checked=subprocess.run(['node','--import','./tools/register-ts.mjs','--input-type=module','-e',validator],input=data,capture_output=True,cwd=root,timeout=10)
  if checked.returncode: raise ValueError()
  report=json.loads(checked.stdout)
  if report['build']!=expected['sourceHash']:
   rejected=private/f'device-report-rejected-{args.variant}-{expected["sourceHash"][:16]}.json'
   rejected.write_text(json.dumps({'expectedSourceHash':expected['sourceHash'],'receivedReport':report},indent=2)+'\n');rejected.chmod(0o600)
   raise ValueError()
  break
 except (OSError,ValueError,urllib.error.URLError,subprocess.TimeoutExpired):
  report=None;time.sleep(1)
if report is None: raise SystemExit('UNVERIFIED report.not_received_or_expected_build_mismatch; no private address logged')
time.sleep(0.3)
try:
 with socket.create_connection((str(address),40322),timeout=1): closed=False
except OSError: closed=True
record={'schema':1,'collectedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceHash':expected['sourceHash'],'signedPackageSha256':expected['sha256'],'version':expected['version'],'applicationId':expected.get('applicationId','BiliProbe1.Probe'),'automation':expected.get('automation'),'client':'authorized-developer-computer-not-phone','httpReport':'PASS','listenerClosedAfterGet':closed,'report':report,'phoneCompatibility':'separate-user-observation','productAcceptance':'UNVERIFIED'}
path=private/f'device-report-{args.variant}-{expected["sourceHash"][:16]}.json';path.write_text(json.dumps(record,indent=2)+'\n');path.chmod(0o600)
(root/('dist/NETWORK_DEVICE_REPORT.json' if args.variant=='network' else 'dist/ISOLATION_DEVICE_REPORT.json' if args.variant=='isolation' else 'dist/DEVICE_REPORT.json')).write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))

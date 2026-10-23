"""Explicit private W01 signing; never installs or changes signing profiles."""
from pathlib import Path
import argparse, base64, datetime, hashlib, json, os, re, subprocess, sys
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('variant', choices=['basic', 'native', 'isolation', 'network'])
parser.add_argument('--profile', default='BiliSofa')
args = parser.parse_args()
private = Path(os.environ.get('BILISOFA_PRIVATE_DIR', str(Path.home()/'.local/share/BiliSofa'))).resolve()
if private.is_relative_to(root):
  raise SystemExit('Private signing output must be outside the repository')
private.mkdir(parents=True, exist_ok=True, mode=0o700)
private.chmod(0o700)
cli = root/'.local/tizen-studio/tools/ide/bin/tizen'
def command(argv, log_name):
  result = subprocess.run(argv, stdin=subprocess.DEVNULL, capture_output=True, timeout=60)
  log = private/log_name
  log.write_bytes(result.stdout + result.stderr)
  log.chmod(0o600)
  return result

config = command([str(cli), 'cli-config', '-l'], 'sign-config.log')
if config.returncode:
  raise SystemExit('BLOCKED cli.configuration_failed; raw log remains private')
match = re.search(r'^default\.profiles\.path=(.+)$', config.stdout.decode(), re.M)
if not match:
  raise SystemExit('BLOCKED profile.path_missing')
profiles = ET.parse(match.group(1).strip()).getroot()
selected = [p for p in profiles if p.get('name') == args.profile]
if len(selected) != 1:
  raise SystemExit('BLOCKED profile.missing_or_ambiguous')
items = {p.get('distributor'): p for p in selected[0]}
for role in ['0', '1']:
  key = Path(items.get(role, {}).get('key', ''))
  if not key.is_file() or 'Apps2Samsung' in str(key):
    raise SystemExit('BLOCKED profile.certificate_missing_or_excluded')
  if role == '1' and key.resolve().is_relative_to(root/'.local/tizen-studio'):
    raise SystemExit('BLOCKED profile.sdk_default_distributor; create Samsung TV Distributor')

verify = [sys.executable, str(root/('tools/verify-network-probe.py' if args.variant == 'network' else 'tools/verify-package.py'))]
if args.variant in ['native','isolation']:
  verify.append('--isolation' if args.variant == 'isolation' else '--native')
result = command(verify, 'sign-input-integrity.log')
if result.returncode:
  raise SystemExit('BLOCKED package.unsigned_integrity_failed')
unsigned = root/f'dist/BiliSofa-W01-{args.variant}-unsigned.wgt'
with zipfile.ZipFile(unsigned) as archive:
  expected_build = json.loads(archive.read('build.json'))
  original = {name: archive.read(name) for name in archive.namelist()}
output = private/'signed'/expected_build['sourceHash'][:16]/args.variant
output.mkdir(parents=True, exist_ok=True, mode=0o700)
output.chmod(0o700)
input_dir = output/'unsigned-input'
input_dir.mkdir(exist_ok=True, mode=0o700)
input_dir.chmod(0o700)
# The vendor signer writes signature XML back into its input directory.
# Keep both the staging tree and its device-bound signatures outside the repo.
for name, data in original.items():
  target = input_dir/name
  target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
  target.write_bytes(data)
  target.chmod(0o600)
result = command([str(cli), 'package', '-t', 'wgt', '-s', args.profile, '-o', str(output), '--', str(input_dir)], f'sign-{args.variant}.log')
if result.returncode:
  raise SystemExit('BLOCKED package.sign_failed; raw log remains private')
packages = [p for p in output.glob('*.wgt') if not p.name.startswith('probe-')]
if len(packages) != 1:
  raise SystemExit('BLOCKED package.output_ambiguous')
signed = packages[0]
signed.chmod(0o600)
now = datetime.datetime.now(datetime.timezone.utc)
with zipfile.ZipFile(signed) as archive:
  for name, data in original.items():
    if archive.read(name) != data:
      raise SystemExit('BLOCKED package.content_changed_during_signing')
  for role, name in [('author', 'author-signature.xml'), ('distributor', 'signature1.xml')]:
    signature = archive.read(name)
    if len(signature) > 128*1024:
      raise SystemExit('BLOCKED signature.size_limit')
    nodes = [node for node in ET.fromstring(signature).iter() if node.tag.endswith('}X509Certificate')]
    if not 1 <= len(nodes) <= 8:
      raise SystemExit('BLOCKED signature.certificate_chain_missing')
    for index, node in enumerate(nodes):
      der = base64.b64decode(''.join((node.text or '').split()), validate=True)
      result = subprocess.run(['/usr/bin/openssl', 'x509', '-inform', 'DER', '-noout', '-startdate', '-enddate', '-issuer'], input=der, capture_output=True, timeout=10, env={**os.environ, 'LC_ALL': 'C'})
      if result.returncode:
        raise SystemExit('BLOCKED signature.certificate_parse_failed')
      fields = dict(line.split('=', 1) for line in result.stdout.decode().splitlines() if '=' in line)
      start = datetime.datetime.strptime(fields['notBefore'], '%b %d %H:%M:%S %Y %Z').replace(tzinfo=datetime.timezone.utc)
      end = datetime.datetime.strptime(fields['notAfter'], '%b %d %H:%M:%S %Y %Z').replace(tzinfo=datetime.timezone.utc)
      if not start <= now < end:
        raise SystemExit(f'BLOCKED signature.{role}_certificate_not_current')
      if index == 0 and 'samsung' not in fields.get('issuer', '').lower():
        raise SystemExit(f'BLOCKED signature.{role}_not_samsung_tv')
normalized = output/f'probe-{args.variant}-signed.wgt'
normalized.write_bytes(signed.read_bytes())
normalized.chmod(0o600)
record = {'schema': 1, 'variant': args.variant, 'package': str(normalized), 'sha256': hashlib.sha256(normalized.read_bytes()).hexdigest(), 'sourceHash': expected_build['sourceHash'], 'profile': args.profile, 'version': expected_build['version'], 'automation': expected_build['automation'], 'applicationId': 'BiliIsola1.Probe' if args.variant == 'isolation' else 'BiliNet001.Probe' if args.variant == 'network' else 'BiliProbe1.Probe', 'certificateDateAndIssuerPreflight': 'PASS', 'deviceInstallation': 'UNVERIFIED'}
manifest = private/f'signed-{args.variant}-manifest.json'
manifest.write_text(json.dumps(record, indent=2)+'\n')
manifest.chmod(0o600)
print(json.dumps({k:v for k,v in record.items() if k not in ['package','profile']}, indent=2))
print('Signed package stays private; preflight is not chain trust, device or product acceptance')

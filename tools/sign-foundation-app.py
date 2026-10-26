"""Explicit signing for BiliSofa01.TV; no install, profile mutation or credentials in output."""
from pathlib import Path
import argparse, base64, datetime, hashlib, json, os, re, subprocess, sys, zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
args_parser = argparse.ArgumentParser(description=__doc__)
args_parser.add_argument('--profile', default='BiliSofa')
args = args_parser.parse_args()
version='0.57.2'
label='App'
# Private records are per version, so earlier signed manifests stay untouched.
pointer='signed-app-'+version+'-manifest.json'
private = Path(os.environ.get('BILISOFA_PRIVATE_DIR', str(Path.home()/'.local/share/BiliSofa'))).resolve()
if private.is_relative_to(ROOT):
    raise SystemExit('Private signing output must be outside the repository')
private.mkdir(parents=True, exist_ok=True, mode=0o700)
private.chmod(0o700)
now = datetime.datetime.now(datetime.timezone.utc)
output = private/'signed'/(label.lower()+'-'+now.strftime('%Y%m%dT%H%M%S%fZ'))
output.mkdir(parents=True, mode=0o700)
cli = ROOT/'.local/tizen-studio/tools/ide/bin/tizen'

def command(argv, name):
    try:
        result = subprocess.run(argv, stdin=subprocess.DEVNULL, capture_output=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        raise SystemExit('BLOCKED signing.tool_unavailable_or_timeout')
    path = output/name
    path.write_bytes(result.stdout+result.stderr)
    path.chmod(0o600)
    return result

result = command([sys.executable, str(ROOT/'tools/package-foundation-app.py')], 'unsigned-validation.log')
if result.returncode:
    raise SystemExit('BLOCKED signing.unsigned_integrity_failed')
unsigned = ROOT/('dist/BiliSofa-'+version+'-unsigned.wgt')
with zipfile.ZipFile(unsigned) as archive:
    original = {name: archive.read(name) for name in archive.namelist()}
    if len(original) != len(archive.namelist()):
        raise SystemExit('BLOCKED signing.duplicate_entry')
build = json.loads(original['build.json'])
if build['identity'] != 'BiliSofa01.TV' or build['version'] != version or any(n in original for n in ['author-signature.xml','signature1.xml']):
    raise SystemExit('BLOCKED signing.identity_mismatch')
result = command([str(cli), 'cli-config', '-l'], 'cli-config.log')
match = re.search(r'^default\.profiles\.path=(.+)$', result.stdout.decode(), re.M)
if result.returncode or not match:
    raise SystemExit('BLOCKED signing.profile_path_missing')
profiles = ET.parse(match.group(1).strip()).getroot()
selected = [p for p in profiles if p.get('name') == args.profile]
if len(selected) != 1:
    raise SystemExit('BLOCKED signing.profile_missing_or_ambiguous')
items = {p.get('distributor'): p for p in selected[0]}
for role in ['0','1']:
    key = Path(items.get(role,{}).get('key',''))
    if not key.is_file() or 'Apps2Samsung' in str(key) or role == '1' and key.resolve().is_relative_to(ROOT/'.local/tizen-studio'):
        raise SystemExit('BLOCKED signing.certificate_missing_or_sdk_default')
stage = output/'input'
stage.mkdir(mode=0o700)
for name, data in original.items():
    if Path(name).is_absolute() or '..' in Path(name).parts:
        raise SystemExit('BLOCKED signing.unsafe_entry')
    target = stage/name
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    target.write_bytes(data)
    target.chmod(0o600)
result = command([str(cli), 'package', '-t', 'wgt', '-s', args.profile, '-o', str(output), '--', str(stage)], 'sign.log')
if result.returncode:
    raise SystemExit('BLOCKED signing.vendor_failed; raw log stays private')
for path in output.rglob('*'):
    path.chmod(0o700 if path.is_dir() else 0o600)
packages = list(output.glob('*.wgt'))
if len(packages) != 1:
    raise SystemExit('BLOCKED signing.output_ambiguous')
signed = packages[0]
signed.chmod(0o600)
with zipfile.ZipFile(signed) as archive:
    if len(archive.namelist()) != len(set(archive.namelist())) or set(archive.namelist()) != set(original)|{'author-signature.xml','signature1.xml'}:
        raise SystemExit('BLOCKED signing.output_entry_mismatch')
    if any(archive.read(n) != data for n,data in original.items()):
        raise SystemExit('BLOCKED signing.content_changed')
    for role,name in [('author','author-signature.xml'),('distributor','signature1.xml')]:
        signature = archive.read(name)
        if len(signature) > 128*1024:
            raise SystemExit('BLOCKED signing.signature_size')
        nodes = [n for n in ET.fromstring(signature).iter() if n.tag.endswith('}X509Certificate')]
        if not 1 <= len(nodes) <= 8:
            raise SystemExit('BLOCKED signing.certificate_chain_missing')
        for index,node in enumerate(nodes):
            der = base64.b64decode(''.join((node.text or '').split()), validate=True)
            result = subprocess.run(['/usr/bin/openssl','x509','-inform','DER','-noout','-startdate','-enddate','-issuer'],input=der,capture_output=True,timeout=10,env={**os.environ,'LC_ALL':'C'})
            if result.returncode:
                raise SystemExit('BLOCKED signing.certificate_parse_failed')
            fields = dict(line.split('=',1) for line in result.stdout.decode().splitlines() if '=' in line)
            dates = [datetime.datetime.strptime(fields[k],'%b %d %H:%M:%S %Y %Z').replace(tzinfo=datetime.timezone.utc) for k in ['notBefore','notAfter']]
            if not dates[0] <= now < dates[1] or index == 0 and 'samsung' not in fields.get('issuer','').lower():
                raise SystemExit('BLOCKED signing.'+role+'_certificate_not_current_samsung_tv')
normalized=output/('BiliSofa-'+label+'-'+version+'-signed.wgt')
normalized.write_bytes(signed.read_bytes())
normalized.chmod(0o600)
record = {'schema':1,'applicationId':build['identity'],'version':build['version'],'unsignedSha256':hashlib.sha256(unsigned.read_bytes()).hexdigest(),'signedSha256':hashlib.sha256(normalized.read_bytes()).hexdigest(),'uiSourceHash':build['uiSourceHash'],'package':str(normalized),'signedAt':now.isoformat(),'certificateDateAndIssuerPreflight':'PASS','deviceInstallation':'UNVERIFIED'}
for path in [output/'manifest.json',private/pointer]:
    path.write_text(json.dumps(record,indent=2)+'\n')
    path.chmod(0o600)
print(json.dumps({k:v for k,v in record.items() if k != 'package'},indent=2))
print('Signed artifact remains private; certificate preflight is not device trust or acceptance')

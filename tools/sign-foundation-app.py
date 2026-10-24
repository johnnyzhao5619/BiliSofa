"""Explicit signing for BiliSofa01.TV; no install, profile mutation or credentials in output."""
from pathlib import Path
import argparse, base64, datetime, hashlib, json, os, re, subprocess, sys, zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
args_parser = argparse.ArgumentParser(description=__doc__)
args_parser.add_argument('--profile', default='BiliSofa')
args_parser.add_argument('--w04', action='store_true')
args_parser.add_argument('--w05', action='store_true')
args_parser.add_argument('--w06', action='store_true')
args_parser.add_argument('--recommend',action='store_true')
args_parser.add_argument('--product-player',action='store_true')
args_parser.add_argument('--product-reading',action='store_true')
args_parser.add_argument('--product-reading-fix',action='store_true')
args_parser.add_argument('--product-reading-fix2',action='store_true')
args_parser.add_argument('--product-detail',action='store_true')
args_parser.add_argument('--product-season',action='store_true')
args_parser.add_argument('--product-season-fix',action='store_true')
args_parser.add_argument('--product-profiles',action='store_true')
args_parser.add_argument('--product-profiles-fix',action='store_true')
args_parser.add_argument('--product-reconnect',action='store_true');args_parser.add_argument('--product-cdn-failover',action='store_true');args_parser.add_argument('--product-source-failover',action='store_true');args_parser.add_argument('--product-up',action='store_true');args_parser.add_argument('--product-up-fix',action='store_true');args_parser.add_argument('--product-up-fix2',action='store_true')
args_parser.add_argument('--product-polish',action='store_true')
args_parser.add_argument('--product-remote',action='store_true')
args_parser.add_argument('--product-acceptance-fix',action='store_true')
args_parser.add_argument('--product-cast-clock',action='store_true')
args_parser.add_argument('--product-cast-seek',action='store_true')
args_parser.add_argument('--product-cast-start',action='store_true')
args_parser.add_argument('--product-recovery',action='store_true')
args_parser.add_argument('--product-stream',action='store_true')
args_parser.add_argument('--product-instant',action='store_true')
args_parser.add_argument('--product-actions',action='store_true')
args_parser.add_argument('--product-interactions',action='store_true')
args_parser.add_argument('--product-browse',action='store_true')
args = args_parser.parse_args()
version='0.51.2' if args.product_up_fix2 else '0.51.1' if args.product_up_fix else '0.51.0' if args.product_up else '0.50.4' if args.product_source_failover else '0.50.3' if args.product_cdn_failover else '0.50.2' if args.product_reconnect else '0.50.1' if args.product_profiles_fix else '0.50.0' if args.product_profiles else '0.49.1' if args.product_season_fix else '0.49.0' if args.product_season else '0.48.0' if args.product_detail else '0.47.2' if args.product_reading_fix2 else '0.47.1' if args.product_reading_fix else '0.47.0' if args.product_reading else '0.46.0' if args.product_polish else '0.45.0' if args.product_remote else '0.44.0' if args.product_acceptance_fix else '0.43.0' if args.product_cast_clock else '0.42.0' if args.product_cast_seek else '0.41.0' if args.product_cast_start else '0.40.0' if args.product_recovery else '0.39.0' if args.product_stream else '0.38.0' if args.product_instant else '0.37.0' if args.product_actions else '0.36.0' if args.product_interactions else '0.35.0' if args.product_browse else '0.34.0' if args.product_player else '0.28.0' if args.recommend else '0.25.0' if args.w06 else '0.24.1' if args.w05 else '0.21.4' if args.w04 else '0.20.0'
label='ProductUpFix2' if args.product_up_fix2 else 'ProductUpFix' if args.product_up_fix else 'ProductUp' if args.product_up else 'ProductSourceFailover' if args.product_source_failover else 'ProductCdnFailover' if args.product_cdn_failover else 'ProductReconnect' if args.product_reconnect else 'ProductProfilesFix' if args.product_profiles_fix else 'ProductProfiles' if args.product_profiles else 'ProductSeasonFix' if args.product_season_fix else 'ProductSeason' if args.product_season else 'ProductDetail' if args.product_detail else 'ProductReadingFix2' if args.product_reading_fix2 else 'ProductReadingFix' if args.product_reading_fix else 'ProductReading' if args.product_reading else 'ProductPolish' if args.product_polish else 'ProductRemote' if args.product_remote else 'ProductAcceptanceFix' if args.product_acceptance_fix else 'ProductCastClock' if args.product_cast_clock else 'ProductCastSeek' if args.product_cast_seek else 'ProductCastStart' if args.product_cast_start else 'ProductRecovery' if args.product_recovery else 'ProductStream' if args.product_stream else 'ProductInstant' if args.product_instant else 'ProductActions' if args.product_actions else 'ProductInteractions' if args.product_interactions else 'ProductBrowse' if args.product_browse else 'U3Product' if args.product_player else 'W03Recommend' if args.recommend else 'W06' if args.w06 else 'W05' if args.w05 else 'W04' if args.w04 else 'W03'
pointer='signed-product-up-fix2-manifest.json' if args.product_up_fix2 else 'signed-product-up-fix-manifest.json' if args.product_up_fix else 'signed-product-up-manifest.json' if args.product_up else 'signed-product-source-failover-manifest.json' if args.product_source_failover else 'signed-product-cdn-failover-manifest.json' if args.product_cdn_failover else 'signed-product-reconnect-manifest.json' if args.product_reconnect else 'signed-product-profiles-fix-manifest.json' if args.product_profiles_fix else 'signed-product-profiles-manifest.json' if args.product_profiles else 'signed-product-season-fix-manifest.json' if args.product_season_fix else 'signed-product-season-manifest.json' if args.product_season else 'signed-product-detail-manifest.json' if args.product_detail else 'signed-product-reading-fix2-manifest.json' if args.product_reading_fix2 else 'signed-product-reading-fix-manifest.json' if args.product_reading_fix else 'signed-product-reading-manifest.json' if args.product_reading else 'signed-product-polish-manifest.json' if args.product_polish else 'signed-product-remote-manifest.json' if args.product_remote else 'signed-product-acceptance-fix-manifest.json' if args.product_acceptance_fix else 'signed-product-cast-clock-manifest.json' if args.product_cast_clock else 'signed-product-cast-seek-manifest.json' if args.product_cast_seek else 'signed-product-cast-start-manifest.json' if args.product_cast_start else 'signed-product-recovery-manifest.json' if args.product_recovery else 'signed-product-stream-manifest.json' if args.product_stream else 'signed-product-instant-manifest.json' if args.product_instant else 'signed-product-actions-manifest.json' if args.product_actions else 'signed-product-interactions-manifest.json' if args.product_interactions else 'signed-product-browse-manifest.json' if args.product_browse else 'signed-product-player-manifest.json' if args.product_player else 'signed-recommend-manifest.json' if args.recommend else 'signed-w06-manifest.json' if args.w06 else 'signed-w05-manifest.json' if args.w05 else 'signed-w04-manifest.json' if args.w04 else 'signed-foundation-manifest.json'
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

result = command([sys.executable, str(ROOT/'tools/package-foundation-app.py')]+(['--product-up-fix2'] if args.product_up_fix2 else ['--product-up-fix'] if args.product_up_fix else ['--product-up'] if args.product_up else ['--product-source-failover'] if args.product_source_failover else ['--product-cdn-failover'] if args.product_cdn_failover else ['--product-reconnect'] if args.product_reconnect else ['--product-profiles-fix'] if args.product_profiles_fix else ['--product-profiles'] if args.product_profiles else ['--product-season-fix'] if args.product_season_fix else ['--product-season'] if args.product_season else ['--product-detail'] if args.product_detail else ['--product-reading-fix2'] if args.product_reading_fix2 else ['--product-reading-fix'] if args.product_reading_fix else ['--product-reading'] if args.product_reading else ['--product-polish'] if args.product_polish else ['--product-remote'] if args.product_remote else ['--product-acceptance-fix'] if args.product_acceptance_fix else ['--product-cast-clock'] if args.product_cast_clock else ['--product-cast-seek'] if args.product_cast_seek else ['--product-cast-start'] if args.product_cast_start else ['--product-recovery'] if args.product_recovery else ['--product-stream'] if args.product_stream else ['--product-instant'] if args.product_instant else ['--product-actions'] if args.product_actions else ['--product-interactions'] if args.product_interactions else ['--product-browse'] if args.product_browse else ['--product-player'] if args.product_player else ['--recommend'] if args.recommend else ['--w06'] if args.w06 else ['--w05'] if args.w05 else ['--w04'] if args.w04 else []), 'unsigned-validation.log')
if result.returncode:
    raise SystemExit('BLOCKED signing.unsigned_integrity_failed')
unsigned = ROOT/('dist/BiliSofa-0.51.2-unsigned.wgt' if args.product_up_fix2 else 'dist/BiliSofa-0.51.1-unsigned.wgt' if args.product_up_fix else 'dist/BiliSofa-0.51.0-unsigned.wgt' if args.product_up else 'dist/BiliSofa-0.50.4-unsigned.wgt' if args.product_source_failover else 'dist/BiliSofa-0.50.3-unsigned.wgt' if args.product_cdn_failover else 'dist/BiliSofa-0.50.2-unsigned.wgt' if args.product_reconnect else 'dist/BiliSofa-0.50.1-unsigned.wgt' if args.product_profiles_fix else 'dist/BiliSofa-0.50.0-unsigned.wgt' if args.product_profiles else 'dist/BiliSofa-0.49.1-unsigned.wgt' if args.product_season_fix else 'dist/BiliSofa-0.49.0-unsigned.wgt' if args.product_season else 'dist/BiliSofa-0.48.0-unsigned.wgt' if args.product_detail else 'dist/BiliSofa-0.47.2-unsigned.wgt' if args.product_reading_fix2 else 'dist/BiliSofa-0.47.1-unsigned.wgt' if args.product_reading_fix else 'dist/BiliSofa-0.47.0-unsigned.wgt' if args.product_reading else 'dist/BiliSofa-0.46.0-unsigned.wgt' if args.product_polish else 'dist/BiliSofa-0.45.0-unsigned.wgt' if args.product_remote else 'dist/BiliSofa-0.44.0-unsigned.wgt' if args.product_acceptance_fix else 'dist/BiliSofa-0.43.0-unsigned.wgt' if args.product_cast_clock else 'dist/BiliSofa-0.42.0-unsigned.wgt' if args.product_cast_seek else 'dist/BiliSofa-0.41.0-unsigned.wgt' if args.product_cast_start else 'dist/BiliSofa-0.40.0-unsigned.wgt' if args.product_recovery else 'dist/BiliSofa-0.39.0-unsigned.wgt' if args.product_stream else 'dist/BiliSofa-0.38.0-unsigned.wgt' if args.product_instant else 'dist/BiliSofa-0.37.0-unsigned.wgt' if args.product_actions else 'dist/BiliSofa-0.36.0-unsigned.wgt' if args.product_interactions else 'dist/BiliSofa-0.35.0-unsigned.wgt' if args.product_browse else 'dist/BiliSofa-U3-0.34.0-unsigned.wgt' if args.product_player else 'dist/BiliSofa-W03-recommend-unsigned.wgt' if args.recommend else 'dist/BiliSofa-W06-cast-unsigned.wgt' if args.w06 else 'dist/BiliSofa-W05-interactions-unsigned.wgt' if args.w05 else 'dist/BiliSofa-W04-media-unsigned.wgt' if args.w04 else 'dist/BiliSofa-W03-account-details-unsigned.wgt')
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

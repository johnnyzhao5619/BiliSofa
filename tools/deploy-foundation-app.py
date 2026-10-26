"""Explicit install/launch of the privately signed W02 app on the one authorized TV."""
from pathlib import Path
import argparse, datetime, hashlib, ipaddress, json, os, re, subprocess, zipfile

parser=argparse.ArgumentParser(description=__doc__);args=parser.parse_args()
version='0.57.2'
ROOT=Path(__file__).resolve().parents[1]
private=Path(os.environ.get('BILISOFA_PRIVATE_DIR',str(Path.home()/'.local/share/BiliSofa'))).resolve()
if private.is_relative_to(ROOT):raise SystemExit('Private deployment metadata must remain outside repository')
try:
    signed=json.loads((private/('signed-app-'+version+'-manifest.json')).read_text())
    target=json.loads((private/'current-tv-target.json').read_text())
    serial=target['serial'];address=ipaddress.ip_address(serial.rsplit(':',1)[0])
    package=Path(signed['package']).resolve()
    if address.version!=4 or not address.is_private or address.is_loopback or address.is_unspecified or address.is_multicast:raise ValueError()
    if not package.is_relative_to(private) or package.is_symlink() or hashlib.sha256(package.read_bytes()).hexdigest()!=signed['signedSha256']:raise ValueError()
    with zipfile.ZipFile(package) as z:build=json.loads(z.read('build.json'))
    if (signed['applicationId'],signed['version'],build['identity'],build['version'],build['uiSourceHash'])!=('BiliSofa01.TV',version,'BiliSofa01.TV',version,signed['uiSourceHash']):raise ValueError()
except (KeyError,ValueError,OSError):raise SystemExit('BLOCKED deployment.private_input_or_identity_invalid')
folder=private/(('app-'+version+'-deploy-')+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
folder.mkdir(mode=0o700)
record={'schema':1,'applicationId':signed['applicationId'],'version':signed['version'],'signedSha256':signed['signedSha256'],'uiSourceHash':signed['uiSourceHash'],'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'deviceAcceptance':'UNVERIFIED'}
def save():
    for p in [folder/'manifest.json',private/('app-'+version+'-deployment-attempt.json')]:
        p.write_text(json.dumps(record,indent=2)+'\n');p.chmod(0o600)
def run(name,argv,positive=None):
    try:
        result=subprocess.run(argv,stdin=subprocess.DEVNULL,capture_output=True,timeout=60 if name in ['install','launch'] else 12)
        output=result.stdout+result.stderr
        log=folder/(name+'.log');log.write_bytes(output);log.chmod(0o600)
        okay=result.returncode==0 and (positive is None or re.search(positive,output.decode(errors='replace'),re.I) is not None)
        record[name]={'exit':result.returncode,'platformSuccess':okay}
    except (OSError,subprocess.TimeoutExpired):
        record[name]={'timeoutOrUnavailable':True};okay=False
    save()
    if not okay:raise SystemExit('BLOCKED deployment.'+name+'_unconfirmed; logs remain private; no automatic retry')
sdb=str(ROOT/'.local/tizen-studio/tools/sdb');cli=str(ROOT/'.local/tizen-studio/tools/ide/bin/tizen')
run('state',[sdb,'-s',serial,'get-state'],r'\bdevice\b')
run('capability',[sdb,'-s',serial,'capability'],r'platform_version:')
run('install',[cli,'install','-n',package.name,'-s',serial,'--',str(package.parent)],r'successfully installed|install completed|installation complete')
run('launch',[cli,'run','-p','BiliSofa01.TV','-s',serial],r'launched the application|successfully launched|launched successfully')
# Publish installed state only after both installation and launch are confirmed.
p=private/('deployed-app-'+version+'-manifest.json');p.write_text(json.dumps(record,indent=2)+'\n');p.chmod(0o600)
print(json.dumps(record,indent=2))
print('Platform install/launch only; visible UI, accounts, media and performance remain UNVERIFIED')

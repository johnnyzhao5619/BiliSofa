"""Evaluate the three collected nonsecret reports, never treating NotFound alone as proof."""
from pathlib import Path
import datetime,json,os
root=Path(__file__).resolve().parents[1]
private=Path(os.environ.get('BILISOFA_PRIVATE_DIR',str(Path.home()/'.local/share/BiliSofa'))).resolve()
if private.is_relative_to(root):raise SystemExit('Private evidence must remain outside repository')
def read(name):
 p=private/name
 if p.stat().st_size>16384:raise ValueError()
 return json.loads(p.read_text())
def has(report,code,verdict=None):return any(e['code']==code and (verdict is None or e['verdict']==verdict) for e in report['report']['entries'])
try:
 before=read('device-native013-isolation-before.json');observer=read('device-native013-isolation-observer.json');after=read('device-native013-isolation-after.json')
 times=[datetime.datetime.fromisoformat(r['collectedAt']) for r in [before,observer,after]]
 if not times[0]<times[1]<times[2] or (times[2]-times[0]).total_seconds()>3600:raise ValueError()
 for key in ['model','firmware','platform']:
  if len({r['report']['environment'][key] for r in [before,observer,after]})!=1 or before['report']['environment'][key]=='unavailable':raise ValueError()
 for r in [before,observer,after]:
  if r['version']!='0.0.13' or r['httpReport']!='PASS' or not r['listenerClosedAfterGet'] or r['report']['build']!=r['sourceHash']:raise ValueError()
 if len({r['sourceHash'] for r in [before,observer,after]})!=1 or before['signedPackageSha256']!=after['signedPackageSha256'] or before['signedPackageSha256']==observer['signedPackageSha256']:raise ValueError()
 if before['applicationId']!='BiliProbe1.Probe' or after['applicationId']!='BiliProbe1.Probe' or observer['applicationId']!='BiliIsola1.Probe':raise ValueError()
 if before['automation']!='synthetic-persistence-report-once' or after['automation']!=before['automation'] or observer['automation']!='synthetic-cross-package-read-report-once':raise ValueError()
 if not all(has(r,'keymanager.owner_identity_confirmed') for r in [before,after]) or not has(observer,'keymanager.observer_identity_confirmed'):raise ValueError()
 if not has(before,'keymanager.persistence_prepared_exit_reopen_required','UNVERIFIED') or not has(after,'keymanager.synthetic_document_restart_read_cleanup_only','PASS'):raise ValueError()
 if not (has(observer,'keymanager.foreign_fixture_not_found','UNVERIFIED') or has(observer,'keymanager.foreign_fixture_security_denied','UNVERIFIED')) or any(e['verdict']=='FAIL' for e in observer['report']['entries']):raise ValueError()
except (OSError,ValueError,KeyError,TypeError):raise SystemExit('UNVERIFIED isolation.three_report_identity_presence_or_denial_not_confirmed')
result={'schema':1,'verdict':'PASS','code':'keymanager.same_author_different_package_synthetic_read_isolation_only','evidenceLayer':'DEVICE REPORT','sourceHash':before['sourceHash'],'ownerSignedSha256':before['signedPackageSha256'],'observerSignedSha256':observer['signedPackageSha256'],'before':'owned synthetic value saved/read','observer':'fixed foreign synthetic fixture not readable','after':'owner value still matched then cleanup confirmed','limits':['same author/different package single fixture only','not encryption, tamper/root resistance, crash atomicity or real session acceptance'],'productAcceptance':'UNVERIFIED'}
for p in [private/'device-native013-isolation-result.json',root/'dist/ISOLATION_RESULT.json']:
 p.write_text(json.dumps(result,indent=2)+'\n')
 if p.is_relative_to(private):p.chmod(0o600)
print(json.dumps(result,indent=2))

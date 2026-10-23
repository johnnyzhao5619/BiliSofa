"""Freeze the exact source manifest used by the probe build."""
from pathlib import Path
import hashlib,json,zipfile,subprocess
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'dist/source-manifest.json').read_text())
out=root/'dist/BiliSofa-W01-source-snapshot.zip'
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for name,digest in sorted(manifest['files'].items()):
  source=root/name
  if not source.resolve().is_relative_to(root) or source.is_symlink(): raise SystemExit('Unsafe source snapshot input')
  data=source.read_bytes()
  if hashlib.sha256(data).hexdigest()!=digest: raise SystemExit('Source changed since build: rebuild before delivery')
  info=zipfile.ZipInfo(name,(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  archive.writestr(info,data)
subprocess.run(['python3',str(root/'tools/verify-package.py')],check=True)
package=root/'dist/BiliSofa-W01-basic-unsigned.wgt'
revision=subprocess.run(['git','rev-parse','--verify','HEAD'],cwd=root,capture_output=True,text=True)
sourceRevision=revision.stdout.strip() if revision.returncode==0 else 'NO_HEAD'
report={
 'schema':1,'sourceRevision':sourceRevision,'sourceSnapshotHash':manifest['sourceHash'],
 'sourceArchive':out.name,'sourceArchiveSha256':hashlib.sha256(out.read_bytes()).hexdigest(),
 'package':package.name,'packageSha256':hashlib.sha256(package.read_bytes()).hexdigest(),
 'signed':False,'nativeNetworkBundled':False,'deviceAcceptance':'UNVERIFIED','productVersionComplete':False,
}
nativePackage=root/'dist/BiliSofa-W01-native-unsigned.wgt'
if nativePackage.exists():
 subprocess.run(['python3',str(root/'tools/verify-package.py'),'--native'],check=True)
 with zipfile.ZipFile(nativePackage) as archive:
  nativeBuild=json.loads(archive.read('build.json'))
 if nativeBuild['sourceHash']!=manifest['sourceHash']: raise SystemExit('Native package source snapshot mismatch: rebuild/package:native')
 report['nativeProbe']={'package':nativePackage.name,'packageSha256':hashlib.sha256(nativePackage.read_bytes()).hexdigest(),'version':nativeBuild['version'],'signed':False,'networkBundled':True,'deviceAcceptance':'UNVERIFIED','dependencyVersions':nativeBuild['dependencyVersions']}
isolationPackage=root/'dist/BiliSofa-W01-isolation-unsigned.wgt'
if isolationPackage.exists():
 subprocess.run(['python3',str(root/'tools/verify-package.py'),'--isolation'],check=True)
 with zipfile.ZipFile(isolationPackage) as archive: isolationBuild=json.loads(archive.read('build.json'))
 if isolationBuild['sourceHash']!=manifest['sourceHash']: raise SystemExit('Observer source mismatch: package:isolation')
 report['isolationObserver']={'package':isolationPackage.name,'packageSha256':hashlib.sha256(isolationPackage.read_bytes()).hexdigest(),'version':isolationBuild['version'],'applicationId':'BiliIsola1.Probe','signed':False,'deviceAcceptance':'UNVERIFIED'}
(root/'dist/DELIVERY.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

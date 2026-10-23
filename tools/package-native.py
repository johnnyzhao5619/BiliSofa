"""Separate native probe stage. Preserve the basic package and reject unaudited inputs."""
from pathlib import Path
import hashlib,json,shutil,zipfile,sys
from candidate_native import load_candidate
root=Path(__file__).resolve().parents[1]
if any(arg != '--modern-network' for arg in sys.argv[1:]): raise SystemExit('Unknown native packaging option')
modern='--modern-network' in sys.argv[1:]
version='0.0.60' if modern else '0.0.54'
basic=root/'dist/probe';native=root/'build/native';out=root/'dist/probe-native'
build=json.loads((basic/'build.json').read_text())
if modern:
 nativeFiles,manifest,licenseFiles,licenseManifest=load_candidate()
else:
 manifest=json.loads((native/'manifest.json').read_text())
media=root/'build/media-probe'
mediaManifest=json.loads((media/'manifest.json').read_text())
mediaFiles={name:digest for name,digest in mediaManifest['files'].items() if name!='probe.mp4'}
if manifest.get('mediaFiles')!=mediaFiles: raise SystemExit('Embedded media manifest mismatch: rebuild native')
for name,digest in mediaFiles.items():
 p=media/name
 if p.is_symlink() or not p.resolve().is_relative_to(media.resolve()) or p.stat().st_size>256*1024 or hashlib.sha256(p.read_bytes()).hexdigest()!=digest: raise SystemExit('Embedded media integrity/bounds failure')
licenses=root/'platform/wasm-network/licenses'
if not modern: licenseManifest=json.loads((licenses/'manifest.json').read_text())
sourceHash=hashlib.sha256(b''.join((root/'platform/wasm-network/src'/name).read_bytes() for name in ['probe.c','probe-http.h','probe-media.h','probe-service.h','probe-guest.h','probe-bridge.h','probe-cast.h','probe-cast-source.h','probe-session.h'])).hexdigest()
if manifest.get('sourceSha256')!=sourceHash: raise SystemExit('Native probe source mismatch: rebuild')
if manifest.get('caSha256')!='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505': raise SystemExit('CA source/license snapshot mismatch')
if set(manifest['files'])!={'probe.js','probe.wasm','probe.data'}: raise SystemExit('Unexpected native artifacts')
for directory,files in ([] if modern else [(native,manifest['files']),(licenses,licenseManifest['files'])]):
 for name,digest in files.items():
  p=directory/name
  if not p.resolve().is_relative_to(directory.resolve()) or p.is_symlink() or hashlib.sha256(p.read_bytes()).hexdigest()!=digest: raise SystemExit('Artifact/license integrity failure')
if (nativeFiles['probe.wasm'] if modern else (native/'probe.wasm').read_bytes())[:8]!=b'\0asm\1\0\0\0': raise SystemExit('Not a WASM binary')
# Rebuilding the stage avoids retaining old license versions across experiments.
# Only the generated, fixed native/license directories are replaced.
for name in ['native','third-party-licenses']:
 staged=out/name
 if staged.is_symlink(): raise SystemExit('Unsafe generated stage')
 if staged.exists(): shutil.rmtree(staged)
out.mkdir(parents=True,exist_ok=True)
for p in basic.iterdir():
 if not p.is_file(): raise SystemExit('Unexpected basic build file')
 shutil.copyfile(p,out/p.name)
(out/'native').mkdir(exist_ok=True);(out/'third-party-licenses').mkdir(exist_ok=True)
for name in manifest['files']:
 (out/'native'/name).write_bytes(nativeFiles[name] if modern else (native/name).read_bytes())
(out/'native/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name in licenseManifest['files']:
 (out/'third-party-licenses'/name).write_bytes(licenseFiles[name] if modern else (licenses/name).read_bytes())
(out/'third-party-licenses/manifest.json').write_text(json.dumps(licenseManifest,indent=2)+'\n')
build['native']=True;build['nativeManifest']=manifest;build['dependencyVersions']=licenseManifest['versions'];build['version']=version
(out/'config.xml').write_text((out/'config.xml').read_text().replace('version="0.0.1"','version="'+version+'"'))
(out/'index.html').write_text((out/'index.html').read_text().replace('内部测试包 0.0.1','内部测试包 '+version))
(out/'build.json').write_text(json.dumps(build,indent=2)+'\n')
expected={p.name for p in basic.iterdir()}|{'native/'+name for name in manifest['files']}|{'native/manifest.json'}|{'third-party-licenses/'+name for name in licenseManifest['files']}|{'third-party-licenses/manifest.json'}
files={str(p.relative_to(out)):p for p in out.rglob('*') if p.is_file()}
if set(files)!=expected: raise SystemExit('Unexpected staged files: do not bundle')
package=root/'dist/BiliSofa-W01-native-unsigned.wgt'
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,p in sorted(files.items()):
  info=zipfile.ZipInfo(name,(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  z.writestr(info,p.read_bytes())
digest=hashlib.sha256(package.read_bytes()).hexdigest()
package.with_suffix('.wgt.sha256').write_text(f'{digest}  {package.name}\n')
print(f'UNSIGNED NATIVE CANDIDATE: {package}\nSHA-256 {digest}\nNot a socket/TLS/device pass')

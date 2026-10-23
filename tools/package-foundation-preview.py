"""Verify/package the local W02 synthetic preview; never signs or installs."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/'dist/foundation-preview'
def digest(data): return hashlib.sha256(data).hexdigest()
manifest=json.loads((STAGE/'build.json').read_text())
expected={'index.html','app.js','style.css','LICENSE'}
if manifest.get('schema')!=1 or manifest.get('target')!='es2020' or set(manifest['files'])!=expected or {p.name for p in STAGE.iterdir()}!=expected|{'build.json'}: raise SystemExit('Foundation preview stage mismatch')
canonical=json.dumps(manifest['inputs'],separators=(',',':'),ensure_ascii=False).encode()
if digest(canonical)!=manifest['sourceHash']: raise SystemExit('Foundation preview source manifest mismatch')
if any(name.startswith(('apps/tv/src/platform/','platform/wasm-network/')) for name in manifest['inputs']): raise SystemExit('Foundation preview must use synthetic platform/account runtimes only')
for name,h in manifest['inputs'].items():
 path=ROOT/name
 if path.is_symlink() or not path.resolve().is_relative_to(ROOT) or digest(path.read_bytes())!=h: raise SystemExit('Foundation preview input changed')
files={}
for name,h in manifest['files'].items():
 path=STAGE/name;data=path.read_bytes()
 if path.is_symlink() or digest(data)!=h: raise SystemExit('Foundation preview output changed')
 if any(pattern in data for pattern in [b'/Users/',b'-----BEGIN PRIVATE KEY-----',b'SESSDATA=',b'bili_jct=']): raise SystemExit('Foundation preview private pattern')
 files[name]=data
files['build.json']=(STAGE/'build.json').read_bytes()
if b"connect-src 'none'" not in files['index.html'] or b'native/' in files['app.js'] or b'account-worker.js' in files['app.js']: raise SystemExit('Foundation preview unexpectedly includes network/account capabilities')
package=ROOT/'dist/BiliSofa-W02-foundation-preview.zip'
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(files.items()):
  info=zipfile.ZipInfo(name,(2026,10,17,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)
package.with_suffix('.zip.sha256').write_text(digest(package.read_bytes())+'  '+package.name+'\n')
print('Local W02 synthetic preview ZIP integrity PASS '+digest(package.read_bytes())+'; not a TV WGT or device pass')

"""ADR-108: resident public read kernel TV WASM into build/public-kernel. No sign/install/network."""
from pathlib import Path
import hashlib,json,os,re,subprocess
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'.local/network-upgrade';SDK=ROOT/'.local/sdk/emscripten-release-bundle/emsdk';PREFIX=BASE/'stage/bilisofa/network';OUT=ROOT/'build/public-kernel'
SRC=ROOT/'platform/wasm-network/src'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
subprocess.run(['python3',str(ROOT/'tools/category-data.py'),'--check'],check=True)
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
ca=ROOT/'.local/cacert.pem';expected='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505'
if ca.is_symlink() or digest(ca)!=expected:raise SystemExit('Public kernel CA mismatch')
OUT.mkdir(parents=True,exist_ok=True)
source=SRC/'public-kernel.c'
command=['/usr/bin/python3',str(SDK/'fastcomp/emscripten/emcc.py'),str(source),'-Os','-DOPENSSL_NO_FILENAMES','--emit-symbol-map','-I'+str(PREFIX/'include'),'-s','ENVIRONMENT_MAY_BE_TIZEN=1','-s','USE_CURL=0','-s','USE_SSL=0','-s','USE_CRYPTO=0','-s','USE_ZLIB=0','-s','ENVIRONMENT=worker','-s','TOTAL_MEMORY=33554432','-s','ALLOW_MEMORY_GROWTH=0','-s','EXTRA_EXPORTED_RUNTIME_METHODS=["callMain"]',*[str(PREFIX/'lib'/n) for n in ['libcurl.a','libssl.a','libcrypto.a']],'--preload-file',str(ca)+'@/cacert.pem','-o','probe.js']
env={**os.environ,'EM_CONFIG':str(SDK/'.emscripten'),'EM_CACHE':str(BASE/'emscripten-cache'),'EM_PORTS':str(BASE/'emscripten-ports')}
with (BASE/'link-public-kernel.log').open('wb') as log:result=subprocess.run(command,cwd=OUT,env=env,stdout=log,stderr=subprocess.STDOUT)
if result.returncode:raise SystemExit('Public kernel SDK link failed; private local tool log retained')
p=OUT/'probe.js';s,count=re.subn(r'("package_uuid"\s*:\s*")[0-9a-f-]+(")',lambda m:m.group(1)+expected+m.group(2),p.read_text())
if count!=1:raise SystemExit('Public kernel preload metadata mismatch')
p.write_text(s)
for n in ['probe.js','probe.wasm','probe.data']:
 data=(OUT/n).read_bytes()
 if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data:raise SystemExit('Public kernel private pattern')
if re.search(r'\beval\s*\(|new Function',s) or (OUT/'probe.wasm').read_bytes()[:8]!=b'\0asm\1\0\0\0' or digest(OUT/'probe.data')!=expected:raise SystemExit('Public kernel runtime policy mismatch')
wasm=(OUT/'probe.wasm').read_bytes()
# Same privilege class only: anonymous public reads. No playback, CDN, account, login or write route may be linked in.
for bad in [b'/x/player/',b'/x/web-interface/view',b'bilivideo',b'/x/passport',b'/qrcode',b'/heartbeat',b'/history/',b'/toview',b'/medialist',b'/fav/',b'/x/v3/',b'/x/space/',b'/x/polymer/',b'feed/rcmd',b'/x/web-interface/coin',b'/x/web-interface/like',b'/pgc/web/follow',b'/x/relation',b'live_room']:
 if bad in wasm:raise SystemExit('Public kernel includes unrelated route '+bad.decode())
for good in [b'/x/web-interface/popular?ps=%d&pn=%d',b'/x/web-interface/ranking/v2',b'/pgc/web/rank/list',b'/pgc/season/index/result',b'/x/series/recArchivesByKeywords',b'/x/frontend/finger/spi',b'/x/web-interface/nav',b'/x/web-interface/wbi/search/type',b'https://s.search.bilibili.com/main/hotword',b'KERNEL:ready',b'KERNEL:closed']:
 if good not in wasm:raise SystemExit('Public kernel lost route '+good.decode())
inputs=[source,*(SRC/n for n in ['probe-guest.h','catalog.c','catalog-up.c','catalog-ua.c','catalog-visitor.c','catalog-categories.h','search.c','hot-search.c']),ROOT/'packages/contracts/data/categories.json',ROOT/'tools/category-data.py',ROOT/'tools/link-public-kernel.py',ROOT/'platform/wasm-network/dependencies/network-candidate.lock.json']
manifest={'schema':1,'purpose':'ADR-108 resident anonymous public read kernel (popular, rankings, PGC lists, UP uploads, visitor identity, WBI search, hot words) over reused connections; not device acceptance','libraryBuild':json.loads((BASE/'candidate-libraries.json').read_text()),'files':{n:digest(OUT/n) for n in ['probe.js','probe.wasm','probe.data']},'sourceInputs':{str(p.relative_to(ROOT)):digest(p) for p in inputs},'caSha256':expected}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Public kernel Samsung WASM linked and scanned; no deployment')

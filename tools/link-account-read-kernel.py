from service_config_data import service_config_strings
"""ADR-108 P0b: resident account read kernel TV WASM into build/account-read-kernel. No sign/install/network."""
from pathlib import Path
import hashlib,json,os,re,subprocess
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'.local/network-upgrade';SDK=ROOT/'.local/sdk/emscripten-release-bundle/emsdk';PREFIX=BASE/'stage/bilisofa/network';OUT=ROOT/'build/service-config/account-read-kernel'
SRC=ROOT/'platform/wasm-network/src'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
subprocess.run(['python3',str(ROOT/'tools/category-data.py'),'--check'],check=True)
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
ca=ROOT/'.local/cacert.pem';expected='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505'
if ca.is_symlink() or digest(ca)!=expected:raise SystemExit('Account kernel CA mismatch')
OUT.mkdir(parents=True,exist_ok=True)
source=SRC/'account-read-kernel.c'
command=['/usr/bin/python3',str(SDK/'fastcomp/emscripten/emcc.py'),str(source),'-Os','-DOPENSSL_NO_FILENAMES','--emit-symbol-map','-I'+str(PREFIX/'include'),'-s','ENVIRONMENT_MAY_BE_TIZEN=1','-s','USE_CURL=0','-s','USE_SSL=0','-s','USE_CRYPTO=0','-s','USE_ZLIB=0','-s','ENVIRONMENT=worker','-s','TOTAL_MEMORY=33554432','-s','ALLOW_MEMORY_GROWTH=0','-s','EXTRA_EXPORTED_RUNTIME_METHODS=["callMain"]',*[str(PREFIX/'lib'/n) for n in ['libcurl.a','libssl.a','libcrypto.a']],'--preload-file',str(ca)+'@/cacert.pem','-o','probe.js']
env={**os.environ,'EM_CONFIG':str(SDK/'.emscripten'),'EM_CACHE':str(BASE/'emscripten-cache'),'EM_PORTS':str(BASE/'emscripten-ports')}
with (BASE/'link-account-read-kernel.log').open('wb') as log:result=subprocess.run(command,cwd=OUT,env=env,stdout=log,stderr=subprocess.STDOUT)
if result.returncode:raise SystemExit('Account kernel SDK link failed; private local tool log retained')
p=OUT/'probe.js';s,count=re.subn(r'("package_uuid"\s*:\s*")[0-9a-f-]+(")',lambda m:m.group(1)+expected+m.group(2),p.read_text())
if count!=1:raise SystemExit('Account kernel preload metadata mismatch')
p.write_text(s)
for n in ['probe.js','probe.wasm','probe.data']:
 data=(OUT/n).read_bytes()
 if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data:raise SystemExit('Account kernel private pattern')
if re.search(r'\beval\s*\(|new Function',s) or (OUT/'probe.wasm').read_bytes()[:8]!=b'\0asm\1\0\0\0' or digest(OUT/'probe.data')!=expected:raise SystemExit('Account kernel runtime policy mismatch')
wasm=(OUT/'probe.wasm').read_bytes()
# Same privilege class only: read-only GETs with the account's own session. No write, login, playback or CDN route.
for bad in [b'/x/player/',b'/heartbeat',b'/x/web-interface/view',b'bilivideo',b'BV14GHy6bE9n',b'/x/passport',b'/qrcode',b'/toview/del',b'/toview/add',b'/history/delete',b'/history/clear',b'/history/report',b'/history/shadow',b'/fav/resource/deal',b'/fav/resource/batch-del',b'/fav/folder/add',b'/fav/folder/del',b'/dynamic/create',b'/dynamic/rm',b'/dynamic/thumb',b'/pgc/web/follow',b'/x/relation',b'/x/web-interface/coin',b'/x/web-interface/like',b'/x/v2/history/toview/add',b's.search.bilibili.com',b'live_room']:
 if bad in wasm:raise SystemExit('Account kernel includes unrelated route '+bad.decode())
for good in [b'/x/web-interface/nav',b'/x/web-interface/history/cursor',b'/x/v3/fav/folder/list4navigate',b'/x/polymer/web-dynamic/v1/feed/nav',b'/x/web-interface/wbi/index/top/feed/rcmd',b'ps=%d&desc=true&otype=2',b'biz_id=%s&ps=%d&desc=true',b'/x/web-interface/ranking/v2?rid=%d&type=all',b'/x/series/recArchivesByKeywords?mid=%s&keywords=&ps=30&pn=%s',b'AUTH:closed']:
 if good not in wasm and good not in service_config_strings(ROOT):raise SystemExit('Account kernel lost route '+good.decode())
inputs=[source,*(SRC/n for n in ['library.c','recommend-read.c','catalog-categories.h']),ROOT/'packages/contracts/data/categories.json',ROOT/'tools/category-data.py',ROOT/'tools/link-account-read-kernel.py',ROOT/'platform/wasm-network/dependencies/network-candidate.lock.json']
manifest={'schema':1,'purpose':'ADR-108 P0b resident account read kernel (history, favorites, follow updates, watch later, recommendations, signed category/UP) over one verified session; not device acceptance','libraryBuild':json.loads((BASE/'candidate-libraries.json').read_text()),'files':{n:digest(OUT/n) for n in ['probe.js','probe.wasm','probe.data']},'serviceSchemaSha256':digest(ROOT/'platform/wasm-network/src/service-config.h'),'sourceInputs':{str(p.relative_to(ROOT)):digest(p) for p in inputs+[ROOT/'tools/service_config_data.py',ROOT/'platform/wasm-network/src/service-config.h']},'caSha256':expected}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Account kernel Samsung WASM linked and scanned; no deployment')

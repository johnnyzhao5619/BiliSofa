"""ADR-102 failover-path relink into its own directory (the original module stays frozen). Build production VOD-read-only TV WASM from pinned local libraries. No sign/install/network."""
from pathlib import Path
import hashlib,json,os,re,subprocess
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'.local/network-upgrade';SDK=ROOT/'.local/sdk/emscripten-release-bundle/emsdk';PREFIX=BASE/'stage/bilisofa/network';OUT=ROOT/'build/service-config/vod-api-failover'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
ca=ROOT/'.local/cacert.pem';expected='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505'
if ca.is_symlink() or digest(ca)!=expected:raise SystemExit('VOD API CA mismatch')
OUT.mkdir(parents=True,exist_ok=True)
source=ROOT/'platform/wasm-network/src/vod-api-failover.c'
command=['/usr/bin/python3',str(SDK/'fastcomp/emscripten/emcc.py'),str(source),'-Os','-DOPENSSL_NO_FILENAMES','--emit-symbol-map','-I'+str(PREFIX/'include'),'-s','ENVIRONMENT_MAY_BE_TIZEN=1','-s','USE_CURL=0','-s','USE_SSL=0','-s','USE_CRYPTO=0','-s','USE_ZLIB=0','-s','ENVIRONMENT=worker','-s','TOTAL_MEMORY=33554432','-s','ALLOW_MEMORY_GROWTH=0','-s','EXTRA_EXPORTED_RUNTIME_METHODS=["callMain"]',*[str(PREFIX/'lib'/n) for n in ['libcurl.a','libssl.a','libcrypto.a']],'--preload-file',str(ca)+'@/cacert.pem','-o','probe.js']
env={**os.environ,'EM_CONFIG':str(SDK/'.emscripten'),'EM_CACHE':str(BASE/'emscripten-cache'),'EM_PORTS':str(BASE/'emscripten-ports')}
with (BASE/'link-vod-api-failover.log').open('wb') as log:result=subprocess.run(command,cwd=OUT,env=env,stdout=log,stderr=subprocess.STDOUT)
if result.returncode:raise SystemExit('VOD API SDK link failed; private local tool log retained')
p=OUT/'probe.js';s,count=re.subn(r'("package_uuid"\s*:\s*")[0-9a-f-]+(")',lambda m:m.group(1)+expected+m.group(2),p.read_text())
if count!=1:raise SystemExit('VOD API preload metadata mismatch')
p.write_text(s)
for n in ['probe.js','probe.wasm','probe.data']:
 data=(OUT/n).read_bytes()
 if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data:raise SystemExit('VOD API private pattern')
if re.search(r'\beval\s*\(|new Function',s) or (OUT/'probe.wasm').read_bytes()[:8]!=b'\0asm\1\0\0\0' or digest(OUT/'probe.data')!=expected:raise SystemExit('VOD API runtime policy mismatch')
for bad in [b'/heartbeat',b'/x/passport',b'/qrcode',b'/toview/add',b'/toview/del',b'/history/report',b'/history/delete',b'/fav/resource/deal',b'/dynamic/create',b'/x/web-interface/coin',b'/x/web-interface/like']:
 if bad in (OUT/'probe.wasm').read_bytes():raise SystemExit('VOD API includes unrelated write/login route')
manifest={'schema':1,'purpose':'W04 fixed nav/view/WBI playurl reads and anonymous 512-byte CDN verification; not device acceptance','libraryBuild':json.loads((BASE/'candidate-libraries.json').read_text()),'files':{n:digest(OUT/n) for n in ['probe.js','probe.wasm','probe.data']},'serviceSchemaSha256':digest(ROOT/'platform/wasm-network/src/service-config.h'),'sourceInputs':{str(p.relative_to(ROOT)):digest(p) for p in [source,ROOT/'platform/wasm-network/src/vod-source-policy.h',ROOT/'platform/wasm-network/src/vod-cdn-policy.h',ROOT/'tools/link-vod-api-failover.py',ROOT/'platform/wasm-network/src/vod-api.c',ROOT/'platform/wasm-network/dependencies/network-candidate.lock.json']},'caSha256':expected,'policy':{'sourceCheckHosts':['media-cdn','media-backup-cdn']}}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('VOD API-only Samsung WASM linked into its failover directory and scanned; no deployment')

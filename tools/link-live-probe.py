"""Isolated W01/G4 live preflight link. Does not rebuild/replace the main receiver."""
from pathlib import Path
import hashlib,json,os,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'.local/network-upgrade'; SDK=ROOT/'.local/sdk/emscripten-release-bundle/emsdk'; PREFIX=BASE/'stage/bilisofa/network'; OUT=ROOT/'build/live-relay-candidate'
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
OUT.mkdir(parents=True,exist_ok=True)
ca=ROOT/'.local/cacert.pem'; digest=lambda data:hashlib.sha256(data).hexdigest()
assert digest(ca.read_bytes())=='a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505'
env={**os.environ,'EM_CONFIG':str(SDK/'.emscripten'),'EM_CACHE':str(BASE/'emscripten-cache'),'EM_PORTS':str(BASE/'emscripten-ports')}
command=['/usr/bin/python3',str(SDK/'fastcomp/emscripten/emcc.py'),str(ROOT/'platform/wasm-network/src/live-relay.c'),'-Os','-DOPENSSL_NO_FILENAMES','--emit-symbol-map','-I'+str(PREFIX/'include'),'-s','ENVIRONMENT_MAY_BE_TIZEN=1','-s','USE_CURL=0','-s','USE_SSL=0','-s','USE_CRYPTO=0','-s','USE_ZLIB=0','-s','ENVIRONMENT=worker','-s','TOTAL_MEMORY=33554432','-s','ALLOW_MEMORY_GROWTH=0','-s','EXTRA_EXPORTED_RUNTIME_METHODS=["callMain"]']+[str(PREFIX/'lib'/n) for n in ['libcurl.a','libssl.a','libcrypto.a']]+['--preload-file',str(ca)+'@/cacert.pem','-o','probe.js']
with (BASE/'link-live.log').open('wb') as log: result=subprocess.run(command,cwd=OUT,env=env,stdout=log,stderr=subprocess.STDOUT)
if result.returncode: raise SystemExit('BLOCKED live.link_failed; local compiler log retained')
js=(OUT/'probe.js').read_text();js,count=re.subn(r'("package_uuid"\s*:\s*")[0-9a-f-]+(")',lambda m:m[1]+digest(ca.read_bytes())+m[2],js)
if count!=1 or 'new Function' in js or re.search(r'\beval\s*\(',js):raise SystemExit('BLOCKED live.runtime_metadata')
(OUT/'probe.js').write_text(js)
files={n:digest((OUT/n).read_bytes()) for n in ['probe.js','probe.wasm','probe.data']}
for n in files:
 data=(OUT/n).read_bytes()
 if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data:raise SystemExit('BLOCKED live.private_pattern')
assert (OUT/'probe.wasm').read_bytes()[:8]==b'\0asm\1\0\0\0'
inputs=['tools/link-live-probe.py','platform/wasm-network/src/live-probe.c','platform/wasm-network/src/live-relay.c']
(OUT/'manifest.json').write_text(json.dumps({'schema':1,'files':files,'sourceInputs':{p:digest((ROOT/p).read_bytes()) for p in inputs},'libraryBuild':json.loads((BASE/'candidate-libraries.json').read_text()),'device':'UNVERIFIED'},indent=2)+'\n')
print('Isolated live WASM link/scans PASS; no TV playback evidence')

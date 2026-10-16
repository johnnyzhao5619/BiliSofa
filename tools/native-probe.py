"""Build only with an explicit Samsung Emscripten executable and CA bundle.
Never sign/install, download CA, replace SDK, or disable TLS implicitly.
"""
from pathlib import Path
import argparse,os,subprocess,hashlib,json,re
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('action',choices=['check','build'])
args=parser.parse_args()
if args.action=='check':
 command=['clang','-std=c11','-D_DEFAULT_SOURCE','-D_DARWIN_C_SOURCE','-Wall','-Wextra','-Werror','-fsyntax-only',str(root/'platform/wasm-network/src/probe.c')]
 raise SystemExit(subprocess.run(command).returncode)
emcc=os.environ.get('BILISOFA_SAMSUNG_EMCC')
ca=os.environ.get('BILISOFA_CA_BUNDLE')
if not emcc or not ca: raise SystemExit('BLOCKED: set BILISOFA_SAMSUNG_EMCC and BILISOFA_CA_BUNDLE; no upstream emcc substitution')
emcc=Path(emcc).resolve();ca=Path(ca).resolve()
if not emcc.is_file() or not ca.is_file(): raise SystemExit('BLOCKED: compiler or CA bundle missing')
out=root/'build/native';out.mkdir(parents=True,exist_ok=True)
python=os.environ.get('BILISOFA_SDK_PYTHON')
compiler=[python,str(emcc)] if python else [str(emcc)]
environment=dict(os.environ)
environment.setdefault('EM_CACHE',str(root/'.local/emscripten-cache'))
environment.setdefault('EM_PORTS',str(root/'.local/emscripten-ports'))
version=subprocess.run(compiler+['--version'],capture_output=True,text=True,env=environment,cwd=out)
if version.returncode or not version.stdout.startswith('emcc (Emscripten gcc/clang-like replacement) 1.39.4.7'):
 raise SystemExit('Expected the fixed Samsung Emscripten 1.39.4.7 compiler')
command=compiler+[str(root/'platform/wasm-network/src/probe.c'),'-Os','-s','ENVIRONMENT_MAY_BE_TIZEN=1','-s','USE_CURL=1','-s','ENVIRONMENT=worker','-s','TOTAL_MEMORY=33554432','-s','ALLOW_MEMORY_GROWTH=0','-s','EXTRA_EXPORTED_RUNTIME_METHODS=["callMain"]','--preload-file',str(ca)+'@/cacert.pem','-o','probe.js']
media=root/'build/media-probe'
subprocess.run(['python3',str(root/'tools/media-probe.py'),'check'],check=True)
mediaManifest=json.loads((media/'manifest.json').read_text())
mediaFiles={name:digest for name,digest in mediaManifest['files'].items() if name!='probe.mp4'}
# Embed exact original synthetic files in JS/MEMFS; public CA preload remains separate.
for name in sorted(mediaFiles): command+=['--embed-file',str(media/name)+'@/probe-media/'+name]
result=subprocess.run(command,cwd=out,env=environment)
if result.returncode: raise SystemExit(result.returncode)
required=['probe.js','probe.wasm','probe.data']
if not all((out/name).is_file() for name in required): raise SystemExit('Incomplete Samsung build output')
caHash=hashlib.sha256(ca.read_bytes()).hexdigest()
# file_packager generates an otherwise random metadata UUID. No preload cache is used.
js=(out/'probe.js').read_text()
js,count=re.subn(r'("package_uuid"\s*:\s*")[0-9a-f-]+(")',lambda m:m.group(1)+caHash+m.group(2),js)
if count!=1: raise SystemExit('Unexpected Samsung packager UUID structure')
if '/Users/' in js or 'new Function' in js or re.search(r'\beval\s*\(',js): raise SystemExit('Unexpected private path or string eval in runtime')
(out/'probe.js').write_text(js)
payload=(out/'probe.data').read_bytes()
inputs=[('/cacert.pem',ca.read_bytes())]+[('/probe-media/'+name,(media/name).read_bytes()) for name in sorted(mediaFiles)]
expected=b''.join(data for name,data in inputs)
if payload!=expected: raise SystemExit('Unexpected SDK CA/media data layout')
layout=[];offset=0
for name,data in inputs:
 layout.append({'name':name,'start':offset,'end':offset+len(data),'sha256':hashlib.sha256(data).hexdigest()});offset+=len(data)
manifest={name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in required}
(out/'manifest.json').write_text(json.dumps({'schema':1,'files':manifest,'compilerVersion':version.stdout.splitlines()[0],'caSha256':caHash,'sourceSha256':hashlib.sha256(b''.join((root/'platform/wasm-network/src'/name).read_bytes() for name in ['probe.c','probe-http.h','probe-media.h','probe-service.h','probe-guest.h','probe-bridge.h','probe-cast.h','probe-cast-source.h'])).hexdigest(),'mediaFiles':mediaFiles,'dataLayout':layout,'candidate':'W01-not-device-accepted','generatedModification':'relative-output-name-and-stable-CA-metadata-UUID'},indent=2)+'\n')
print('Native probe built in build/native; package requires separate license verification')

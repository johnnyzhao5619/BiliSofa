"""Explicit production-DASH candidate link; no sign/install/network requests."""
from pathlib import Path
import hashlib
import json
import os
import re
import runpy
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / '.local/network-upgrade'
SDK = ROOT / '.local/sdk/emscripten-release-bundle/emsdk'
PREFIX = BASE / 'stage/bilisofa/network'
OUT = ROOT / 'build/vod'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


subprocess.run(['python3', str(ROOT / 'tools/build-network-candidate.py'), 'check'], check=True)
ca = ROOT / '.local/cacert.pem'
expected = 'a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505'
if ca.is_symlink() or digest(ca) != expected:
    raise SystemExit('VOD CA mismatch')
OUT.mkdir(parents=True, exist_ok=True)
generated = OUT / 'vod-bridge-generated.h'
runpy.run_path(str(ROOT / 'tools/vod-bridge-source.py'))['generate'](generated)
source = ROOT / 'platform/wasm-network/src/vod-bridge.c'
command = ['/usr/bin/python3', str(SDK / 'fastcomp/emscripten/emcc.py'), str(source), '-Os', '-DOPENSSL_NO_FILENAMES', '--emit-symbol-map',
    '-I' + str(PREFIX / 'include'), '-I' + str(OUT), '-I' + str(source.parent), '-s', 'ENVIRONMENT_MAY_BE_TIZEN=1', '-s', 'USE_CURL=0', '-s', 'USE_SSL=0',
    '-s', 'USE_CRYPTO=0', '-s', 'USE_ZLIB=0', '-s', 'ENVIRONMENT=worker', '-s', 'TOTAL_MEMORY=33554432', '-s', 'ALLOW_MEMORY_GROWTH=0',
    '-s', 'EXTRA_EXPORTED_RUNTIME_METHODS=["callMain"]', *[str(PREFIX / 'lib' / name) for name in ['libcurl.a', 'libssl.a', 'libcrypto.a']],
    '--preload-file', str(ca) + '@/cacert.pem', '-o', 'probe.js']
env = {**os.environ, 'EM_CONFIG': str(SDK / '.emscripten'), 'EM_CACHE': str(BASE / 'emscripten-cache'), 'EM_PORTS': str(BASE / 'emscripten-ports')}
with (BASE / 'link-vod-bridge.log').open('wb') as log:
    result = subprocess.run(command, cwd=OUT, env=env, stdout=log, stderr=subprocess.STDOUT)
if result.returncode:
    raise SystemExit('VOD bridge Samsung link failed; local tool log retained')
script = OUT / 'probe.js'
text, count = re.subn(r'("package_uuid"\s*:\s*")[0-9a-f-]+(")', lambda m: m.group(1) + expected + m.group(2), script.read_text())
if count != 1:
    raise SystemExit('VOD preload metadata mismatch')
script.write_text(text)
for name in ['probe.js', 'probe.wasm', 'probe.data']:
    content = (OUT / name).read_bytes()
    if b'/Users/' in content or b'-----BEGIN PRIVATE KEY-----' in content:
        raise SystemExit('VOD private pattern')
if re.search(r'\beval\s*\(|new Function', text) or (OUT / 'probe.wasm').read_bytes()[:8] != b'\0asm\1\0\0\0' or digest(OUT / 'probe.data') != expected:
    raise SystemExit('VOD runtime policy mismatch')
for forbidden in [b'/heartbeat', b'/qrcode', b'/history/report', b'/x/web-interface/coin', b'/x/web-interface/popular', b'/x/player/playurl']:
    if forbidden in (OUT / 'probe.wasm').read_bytes():
        raise SystemExit('Bridge-only module includes unrelated API path')
inputs = [source, ROOT / 'platform/wasm-network/src/probe-http.h', ROOT / 'platform/wasm-network/src/vod-source-policy.h',
    ROOT / 'platform/wasm-network/src/probe-bridge.h', ROOT / 'platform/wasm-network/src/vod-bridge-policy.h',
    ROOT / 'tools/vod-bridge-source.py', ROOT / 'tools/link-vod-bridge.py', ROOT / 'platform/wasm-network/dependencies/network-candidate.lock.json']
manifest = {'schema': 1, 'purpose': 'W04 production DASH bridge candidate; not installed or device accepted',
    'policy': {'loopbackOnly': True, 'clients': 4, 'ringBytesPerClient': 65536, 'upstreamWindowBytes': 2097152,
        'maxIndexEnd': 16777216, 'signatureBoundLease': True, 'ownedRenewal': True, 'cumulativeProbeQuotas': False},
    'libraryBuild': json.loads((BASE / 'candidate-libraries.json').read_text()), 'files': {name: digest(OUT / name) for name in ['probe.js', 'probe.wasm', 'probe.data']},
    'sourceInputs': {str(p.relative_to(ROOT)): digest(p) for p in inputs}, 'generatedHeaderSha256': digest(generated), 'caSha256': expected}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Production DASH bridge linked and scanned with Samsung SDK; no deployment')

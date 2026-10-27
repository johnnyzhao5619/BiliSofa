"""Explicit isolated final-WASM link. Keeps build/native and TV deployment intact."""
from pathlib import Path
import hashlib, json, os, re, shutil, subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / '.local/network-upgrade'
SDK = ROOT / '.local/sdk/emscripten-release-bundle/emsdk'
PREFIX = BASE / 'stage/bilisofa/network'
OUT = ROOT / 'build/service-config/network-candidate'
subprocess.run(['python3', str(ROOT / 'tools/build-network-candidate.py'), 'check'], check=True)
lock = json.loads((ROOT / 'platform/wasm-network/dependencies/network-candidate.lock.json').read_text())
libraries = json.loads((BASE / 'candidate-libraries.json').read_text())
env = {**os.environ, 'EM_CONFIG': str(SDK / '.emscripten'),
       'EM_CACHE': str(BASE / 'emscripten-cache'), 'EM_PORTS': str(BASE / 'emscripten-ports')}
compiler = ['/usr/bin/python3', str(SDK / 'fastcomp/emscripten/emcc.py')]
flags = ['-Os', '-DOPENSSL_NO_FILENAMES', '--emit-symbol-map', '-I' + str(PREFIX / 'include'), '-s', 'ENVIRONMENT_MAY_BE_TIZEN=1',
         '-s', 'USE_CURL=0', '-s', 'USE_SSL=0', '-s', 'USE_CRYPTO=0', '-s', 'USE_ZLIB=0',
         '-s', 'ENVIRONMENT=worker', '-s', 'TOTAL_MEMORY=33554432',
         '-s', 'ALLOW_MEMORY_GROWTH=0', '-s', 'EXTRA_EXPORTED_RUNTIME_METHODS=["callMain"]']
libargs = [str(PREFIX / 'lib' / name) for name in ['libcurl.a', 'libssl.a', 'libcrypto.a']]
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run(['python3', str(ROOT / 'tools/media-probe.py'), 'check'], check=True)
media = ROOT / 'build/media-probe'
media_manifest = json.loads((media / 'manifest.json').read_text())
media_files = {name: value for name, value in media_manifest['files'].items() if name != 'probe.mp4'}
ca = ROOT / '.local/cacert.pem'
if hashlib.sha256(ca.read_bytes()).hexdigest() != 'a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505':
  raise SystemExit('BLOCKED candidate.ca_snapshot_mismatch')
outputs = {}
for kind, source in [('selftest', ROOT / 'tests/native/network-candidate-selftest.c'),
                     ('validation', ROOT / 'platform/wasm-network/src/network-validation.c'),
                     ('https-session', ROOT / 'platform/wasm-network/src/session-https.c'),
                     ('account', ROOT / 'platform/wasm-network/src/account-probe.c'),
                     ('account-readback', ROOT / 'platform/wasm-network/src/account-readback.c'),
                     ('progress-post', ROOT / 'platform/wasm-network/src/progress-post.c'),
                     ('probe', ROOT / 'platform/wasm-network/src/probe.c')]:
  folder = OUT / kind
  folder.mkdir(exist_ok=True)
  command = compiler + [str(source)] + flags + libargs + ['-o', 'probe.js']
  if kind in ['probe', 'validation', 'account', 'account-readback', 'progress-post']:
    command += ['--preload-file', str(ca) + '@/cacert.pem']
  if kind == 'probe':
    for name in sorted(media_files):
      command += ['--embed-file', str(media / name) + '@/probe-media/' + name]
  log = BASE / ('link-' + kind + '.log')
  with log.open('wb') as stream:
    p = subprocess.run(command, cwd=folder, env=env, stdout=stream, stderr=subprocess.STDOUT)
  print('candidate link', kind, p.returncode, flush=True)
  if p.returncode: raise SystemExit(f'BLOCKED candidate.link_{kind}; see {log}')
  if kind in ['probe', 'validation', 'account', 'account-readback', 'progress-post']:
    js = (folder / 'probe.js').read_text()
    js, count = re.subn(r'("package_uuid"\s*:\s*")[0-9a-f-]+(")',
        lambda m: m.group(1) + hashlib.sha256(ca.read_bytes()).hexdigest() + m.group(2), js)
    if count != 1: raise SystemExit('BLOCKED candidate.unexpected_metadata')
    (folder / 'probe.js').write_text(js)
  for name in ['probe.js', 'probe.wasm'] + (['probe.data'] if kind in ['probe', 'validation', 'account', 'account-readback', 'progress-post'] else []):
    payload = (folder / name).read_bytes()
    if b'/Users/' in payload or b'-----BEGIN PRIVATE KEY-----' in payload:
      raise SystemExit('BLOCKED candidate.private_path_or_key_pattern')
    outputs[kind + '/' + name] = hashlib.sha256(payload).hexdigest()
  js = (folder / 'probe.js').read_text()
  if 'new Function' in js or re.search(r'\beval\s*\(', js):
    raise SystemExit('BLOCKED candidate.string_eval')
  if (folder / 'probe.wasm').read_bytes()[:8] != b'\0asm\1\0\0\0':
    raise SystemExit('BLOCKED candidate.not_wasm')

license_out = OUT / 'licenses'
license_out.mkdir(exist_ok=True)
old_licenses = ROOT / 'platform/wasm-network/licenses'
old_manifest = json.loads((old_licenses / 'manifest.json').read_text())
for name, expected in old_manifest['files'].items():
  if name in ['OpenSSL-LICENSE.txt', 'curl-COPYING.txt', 'zlib-LICENSE.txt', 'NOTICE.txt']: continue
  data = (old_licenses / name).read_bytes()
  if hashlib.sha256(data).hexdigest() != expected: raise SystemExit('BLOCKED candidate.runtime_license_mismatch')
  (license_out / name).write_bytes(data)
for relative, name in [('openssl-3.5.9/LICENSE.txt', 'OpenSSL-3-LICENSE.txt'),
                        ('curl-8.23.0/COPYING', 'curl-COPYING.txt')]:
  shutil.copyfile(BASE / 'pinned-src' / relative, license_out / name)
notice = ('BiliSofa original W01 candidate. OpenSSL 3.5.9: Apache-2.0; curl 8.23.0: curl license.\n'
          'Local curl compatibility patch omits optional close-time TCP drain only for the Samsung build; see pinned patch metadata.\n'
          'Compiler/runtime notices retained separately. No zlib port linked. Mozilla CA data: MPL-2.0.\n'
          'CA source: https://curl.se/ca/cacert-2026-09-25.pem (unmodified; SHA256 '
          'a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505).\n'
          'Sources and published SHA256 are pinned in network-candidate.lock.json.\n')
(license_out / 'NOTICE.txt').write_text(notice)
license_hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(license_out.iterdir())}
manifest = {'schema': 1, 'status': 'W01-link-only-not-TV-or-credential-approval',
  'dependencies': {'curl': lock['curl']['version'], 'openssl': lock['openssl']['version'], 'zlib': 'not-linked'},
  'curlPatches': lock['curl'].get('patches', []),
  'libraryBuild': libraries, 'outputs': outputs, 'licenses': license_hashes,
  'serviceSchemaSha256':hashlib.sha256((ROOT/'platform/wasm-network/src/service-config.h').read_bytes()).hexdigest(),'sourceInputs': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
      for p in [ROOT / 'tools/link-network-candidate.py', ROOT / 'tools/build-network-candidate.py', ROOT / 'platform/wasm-network/dependencies/network-candidate.lock.json', ROOT / 'tests/native/network-candidate-selftest.c', ROOT / 'platform/wasm-network/src/network-validation.c', ROOT / 'platform/wasm-network/src/session-https.c', ROOT / 'platform/wasm-network/src/account-probe.c', ROOT / 'platform/wasm-network/src/account-readback.c', ROOT / 'platform/wasm-network/src/progress-post.c'] +
      [ROOT / 'platform/wasm-network/dependencies' / patch['file'] for patch in lock['curl'].get('patches', [])] +
      sorted((ROOT / 'platform/wasm-network/src').glob('probe*.[ch]'))},
  'tvRuntime': 'UNVERIFIED', 'authenticatedUse': 'UNVERIFIED'}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
(OUT / 'selftest/index.html').write_text('<!doctype html><html><head><meta charset="utf-8">'
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; '
    'script-src \'self\' \'wasm-unsafe-eval\'; worker-src \'self\'; connect-src \'self\'">'
    '<title>W01 dependency Worker self-test</title></head><body>Desktop candidate harness; no TV/TLS evidence.</body></html>')
(OUT / 'selftest/selftest-worker.js').write_text('''
if (new URL(self.location.href).searchParams.has('no-crypto'))
  Object.defineProperty(globalThis, 'crypto', { value: undefined });
var Module = {
  noInitialRun: true,
  onRuntimeInitialized() { Module.callMain([]); },
  locateFile(name) { return name; },
  print(line) {
    const allowed = ['DEPS:versions_protocols_pass', 'DEPS:crypto_random_pass',
      'DEPS:scoped_options_pass', 'DEPS:selftest_complete_no_network'];
    postMessage(allowed.includes(line) ? line : 'DEPS:unexpected_output');
  },
  printErr() {},
  onAbort() { postMessage('DEPS:abort_no_success'); }
};
try { importScripts('probe.js'); } catch { postMessage('DEPS:abort_no_success'); }
''')
print('Candidate final WASM linked/scanned; normal signed probe remains separate')

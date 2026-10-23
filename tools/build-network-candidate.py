"""Explicit isolated W01 dependency experiment. Does not package, sign or deploy.

fetch downloads only pinned HTTPS archives. build verifies them before extraction
and uses the installed Samsung compiler without editing its ports or configuration.
check verifies completed static archives; none of these actions approves credentials.
"""
from pathlib import Path
import argparse, hashlib, json, os, shlex, subprocess, tarfile

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / 'platform/wasm-network/dependencies/network-candidate.lock.json'
BASE = ROOT / '.local/network-upgrade'
SDK = ROOT / '.local/sdk/emscripten-release-bundle/emsdk'
EMSCRIPTEN = SDK / 'fastcomp/emscripten'
PREFIX = BASE / 'stage/bilisofa/network'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['fetch', 'build', 'check'])
args = parser.parse_args()
lock = json.loads(LOCK.read_text())
patches = lock['curl'].get('patches', [])

def digest(path):
  return hashlib.sha256(path.read_bytes()).hexdigest()

def run(name, argv, *, cwd=BASE, env=None):
  log = BASE / (name + '.log')
  with log.open('wb') as stream:
    result = subprocess.run(argv, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                            stdout=stream, stderr=subprocess.STDOUT)
  print(name, result.returncode, flush=True)
  if result.returncode:
    raise SystemExit(f'BLOCKED {name}; diagnostic log: {log}')

BASE.mkdir(parents=True, exist_ok=True)
downloads = BASE / 'downloads'
downloads.mkdir(exist_ok=True)
for patch in patches:
  path = LOCK.parent / patch['file']
  if not path.resolve().is_relative_to(LOCK.parent.resolve()) or path.is_symlink() or digest(path) != patch['sha256']:
    raise SystemExit('BLOCKED candidate.patch_missing_or_mismatch')
for key in ['openssl', 'curl']:
  item = lock[key]
  archive = downloads / item['archive']
  if args.action == 'fetch' and not archive.exists():
    run('fetch-' + key, ['/usr/bin/curl', '--fail', '--location', '--proto', '=https',
        '--proto-redir', '=https', '--silent', '--show-error', '--max-time', '120',
        item['url'], '-o', str(archive)])
  if not archive.is_file() or archive.is_symlink() or digest(archive) != item['sha256']:
    raise SystemExit(f'BLOCKED {key}.pinned_archive_missing_or_mismatch; run fetch explicitly')
if args.action == 'fetch':
  print('Pinned archives verified; no source executed')
  raise SystemExit(0)

manifest_path = BASE / 'candidate-libraries.json'
if args.action == 'check':
  value = json.loads(manifest_path.read_text())
  if value['lockSha256'] != digest(LOCK) or value['recipeSha256'] != digest(Path(__file__)):
    raise SystemExit('BLOCKED candidate.recipe_or_lock_changed')
  for name, expected in value['libraries'].items():
    path = PREFIX / 'lib' / name
    if path.is_symlink() or digest(path) != expected or path.read_bytes()[:8] != b'!<arch>\n':
      raise SystemExit('BLOCKED candidate.static_archive_integrity')
  print('Candidate static archives verified; TV/TLS/credentials remain UNVERIFIED')
  raise SystemExit(0)

sources = BASE / 'pinned-src'
sources.mkdir(exist_ok=True)
for key in ['openssl', 'curl']:
  item = lock[key]
  folder = sources / (key + '-' + item['version'])
  # Re-extract pinned originals even on rebuild; never reuse a hand-edited source.
  with tarfile.open(downloads / item['archive']) as archive:
    if any(m.name != folder.name and not m.name.startswith(folder.name + '/') for m in archive.getmembers()):
      raise SystemExit('BLOCKED candidate.unexpected_archive_root')
    archive.extractall(sources, filter='data')
for patch in patches:
  source = sources / ('curl-' + lock['curl']['version'])
  target = source / patch['target']
  if not target.resolve().is_relative_to(source.resolve()) or digest(target) != patch['inputSha256']:
    raise SystemExit('BLOCKED candidate.patch_input_mismatch')
  run('curl-close-drain-patch', ['/usr/bin/patch','--batch','--forward','--fuzz=0','-p1','-i',str(LOCK.parent/patch['file'])], cwd=source)
  if digest(target) != patch['outputSha256']:
    raise SystemExit('BLOCKED candidate.patch_output_mismatch')
bin_dir = BASE / 'bin'
bin_dir.mkdir(exist_ok=True)
for name in ['emcc', 'emar', 'emranlib']:
  wrapper = bin_dir / ('bilisofa-' + name)
  wrapper.write_text('#!/bin/sh\nexec /usr/bin/python3 ' +
                     shlex.quote(str(EMSCRIPTEN / (name + '.py'))) + ' "$@"\n')
  wrapper.chmod(0o700)
env = {**os.environ, 'PATH': str(bin_dir) + os.pathsep + os.environ['PATH'],
       'EM_CONFIG': str(SDK / '.emscripten'), 'EM_CACHE': str(BASE / 'emscripten-cache'),
       'EM_PORTS': str(BASE / 'emscripten-ports'), 'SOURCE_DATE_EPOCH': '1791936000',
       'CC': 'bilisofa-emcc', 'AR': 'bilisofa-emar', 'RANLIB': 'bilisofa-emranlib'}
version = subprocess.run([str(bin_dir / 'bilisofa-emcc'), '--version'], env=env,
                         capture_output=True, text=True, check=True).stdout
if not version.startswith('emcc (Emscripten gcc/clang-like replacement) 1.39.4.7'):
  raise SystemExit('BLOCKED candidate.wrong_samsung_compiler')
openssl_build = BASE / 'openssl-repro'
openssl_build.mkdir(exist_ok=True)
openssl_args = ['/usr/bin/perl', str(sources / 'openssl-3.5.9/Configure'),
  'linux-generic32', 'no-asm', 'no-shared', 'no-dso', 'no-engine', 'no-async',
  'no-threads', 'no-tests', 'no-module', 'no-apps', 'no-ui-console', 'no-secure-memory',
  'no-autoload-config', '--with-rand-seed=devrandom', '--prefix=/bilisofa/network',
  '--openssldir=/bilisofa/ssl', '--libdir=lib', '-Os']
run('openssl-repro-configure', openssl_args, cwd=openssl_build, env=env)
run('openssl-repro-make', ['/usr/bin/make', '-j4', 'build_libs'], cwd=openssl_build, env=env)
run('openssl-repro-install', ['/usr/bin/make', 'install_dev', 'DESTDIR=' + str(BASE / 'stage')],
    cwd=openssl_build, env=env)
toolchain = BASE / 'candidate-toolchain.cmake'
toolchain.write_text('\n'.join([
  'set(CMAKE_SYSTEM_NAME Emscripten)', 'set(CMAKE_SYSTEM_PROCESSOR wasm32)',
  'set(CMAKE_CROSSCOMPILING TRUE)', 'set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)',
  f'set(CMAKE_C_COMPILER "{bin_dir}/bilisofa-emcc")',
  f'set(CMAKE_AR "{bin_dir}/bilisofa-emar")',
  f'set(CMAKE_RANLIB "{bin_dir}/bilisofa-emranlib")', 'set(CMAKE_C_FLAGS_INIT "-Os")',
  'set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)',
  'set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)', 'set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)',
  f'set(CMAKE_FIND_ROOT_PATH "{PREFIX}")']) + '\n')
curl_build = BASE / 'curl-repro'
curl_args = ['cmake', '-S', str(sources / 'curl-8.23.0'), '-B', str(curl_build),
  '-DCMAKE_TOOLCHAIN_FILE=' + str(toolchain), '-DCMAKE_BUILD_TYPE=MinSizeRel',
  '-DCMAKE_INSTALL_PREFIX=' + str(PREFIX), '-DCMAKE_C_FLAGS=-Os -DOPENSSL_NO_FILENAMES -DBILISOFA_TIZEN_NO_CLOSE_DRAIN',
  '-DBUILD_CURL_EXE=OFF', '-DBUILD_TESTING=OFF',
  '-DBUILD_SHARED_LIBS=OFF', '-DBUILD_LIBCURL_DOCS=OFF', '-DENABLE_CURL_MANUAL=OFF',
  '-DCURL_USE_OPENSSL=ON', '-DOPENSSL_ROOT_DIR=' + str(PREFIX), '-DOPENSSL_USE_STATIC_LIBS=ON',
  '-DCURL_ZLIB=OFF', '-DCURL_BROTLI=OFF', '-DCURL_ZSTD=OFF', '-DCURL_USE_LIBPSL=OFF',
  '-DCURL_USE_LIBSSH2=OFF', '-DUSE_LIBIDN2=OFF', '-DUSE_NGHTTP2=OFF', '-DUSE_NGTCP2=OFF',
  '-DUSE_QUICHE=OFF', '-DENABLE_THREADED_RESOLVER=OFF', '-DENABLE_ARES=OFF',
  '-DENABLE_IPV6=OFF', '-DENABLE_UNIX_SOCKETS=OFF', '-DCURL_DISABLE_SOCKETPAIR=ON',
  # Keep CURLOPT_PROXY available so every existing request can explicitly set "".
  '-DCURL_DISABLE_PROXY=OFF', '-DCURL_DISABLE_NETRC=ON', '-DCURL_DISABLE_HTTP_AUTH=ON',
  '-DCURL_CA_BUNDLE=/cacert.pem', '-DCURL_CA_PATH=none', '-DCURL_CA_FALLBACK=OFF']
for protocol in ['DICT', 'FILE', 'FTP', 'GOPHER', 'IMAP', 'LDAP', 'LDAPS', 'MQTT',
                 'POP3', 'RTSP', 'SMB', 'SMTP', 'TELNET', 'TFTP', 'WEBSOCKETS', 'IPFS']:
  curl_args.append('-DCURL_DISABLE_' + protocol + '=ON')
run('curl-repro-configure', curl_args, env=env)
run('curl-repro-make', ['cmake', '--build', str(curl_build), '--parallel', '4'], env=env)
run('curl-repro-install', ['cmake', '--install', str(curl_build)], env=env)
libraries = {name: digest(PREFIX / 'lib' / name) for name in ['libcurl.a', 'libssl.a', 'libcrypto.a']}
manifest_path.write_text(json.dumps({'schema': 1, 'status': lock['status'],
  'lockSha256': digest(LOCK), 'recipeSha256': digest(Path(__file__)),
  'compilerVersion': version.splitlines()[0], 'libraries': libraries,
  'credentialApproval': 'UNVERIFIED', 'tvRuntime': 'UNVERIFIED'}, indent=2) + '\n')
print('Candidate libraries built; separate runtime verification and packaging required')

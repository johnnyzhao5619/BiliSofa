"""Prepare HOST-only curl fixtures from already verified pinned sources. No SDK/TV changes.
Requires an existing Homebrew OpenSSL 3 installation; never installs a system dependency.
"""
from pathlib import Path
import subprocess,json,hashlib,os
root=Path(__file__).resolve().parents[1];folder=root/'.local/host-network';folder.mkdir(exist_ok=True);source=root/'.local/network-upgrade/pinned-src/curl-8.23.0'
openssl=Path(os.environ.get('BILISOFA_HOST_OPENSSL_PREFIX','/opt/homebrew/opt/openssl@3'))
if not (openssl/'include/openssl/ssl.h').is_file():raise SystemExit('HOST OpenSSL headers missing; supply BILISOFA_HOST_OPENSSL_PREFIX')
lock=json.loads((root/'platform/wasm-network/dependencies/network-candidate.lock.json').read_text())
for patch in lock['curl'].get('patches',[]):
 if hashlib.sha256((source/patch['target']).read_bytes()).hexdigest()!=patch['outputSha256']:raise SystemExit('Pinned HOST curl source patch mismatch')
args=['cmake','-S',str(source),'-B',str(folder/'curl-build'),'-DCMAKE_BUILD_TYPE=MinSizeRel','-DCMAKE_INSTALL_PREFIX='+str(folder/'prefix'),'-DCMAKE_OSX_ARCHITECTURES=arm64','-DBUILD_CURL_EXE=OFF','-DBUILD_TESTING=OFF','-DBUILD_SHARED_LIBS=OFF','-DBUILD_LIBCURL_DOCS=OFF','-DENABLE_CURL_MANUAL=OFF','-DCURL_USE_OPENSSL=ON','-DOPENSSL_ROOT_DIR='+str(openssl),'-DCURL_USE_APPLE_SECTRUST=OFF','-DCURL_USE_SECTRANSP=OFF','-DCURL_ZLIB=OFF','-DCURL_BROTLI=OFF','-DCURL_ZSTD=OFF','-DCURL_USE_LIBPSL=OFF','-DCURL_USE_LIBSSH2=OFF','-DUSE_LIBIDN2=OFF','-DUSE_NGHTTP2=OFF','-DENABLE_THREADED_RESOLVER=OFF','-DENABLE_ARES=OFF']
for name,argv in [('configure',args),('build',['cmake','--build',str(folder/'curl-build'),'--parallel','4']),('install',['cmake','--install',str(folder/'curl-build')])]:
 with (folder/(name+'.log')).open('wb') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT)
 print(json.dumps({'hostCurl':name,'exit':p.returncode}),flush=True)
 if p.returncode:raise SystemExit(1)
manifest={'schema':1,'hostOnly':True,'curlVersion':lock['curl']['version'],'opensslPrefix':str(openssl),'opensslVersion':subprocess.run([str(openssl/'bin/openssl'),'version'],capture_output=True,text=True,check=True).stdout.strip(),'curlArchiveSha256':hashlib.sha256((folder/'prefix/lib/libcurl.a').read_bytes()).hexdigest(),'recipeSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('HOST fixture libraries ready; not Samsung WASM, TV TLS, or account evidence')

"""Build/verify unsigned internal WGT from explicit UI, identity and anonymous media inputs."""
from pathlib import Path
from candidate_native import load_candidate
import argparse,hashlib,json,re,zipfile,subprocess,xml.etree.ElementTree as ET
parser=argparse.ArgumentParser(description=__doc__);args=parser.parse_args()
version=ET.parse(Path(__file__).resolve().parents[1]/'apps/tv/foundation-config.xml').getroot().attrib['version']
ROOT=Path(__file__).resolve().parents[1];STAGE=ROOT/'dist/bilisofa-configured-app';NATIVE=ROOT/'build/service-config/identity'
subprocess.run(['python3',str(ROOT/'tools/category-data.py'),'--check'],check=True)
def sha(data):return hashlib.sha256(data).hexdigest()
def checked(path,h):
 if path.is_symlink() or not path.resolve().is_relative_to(ROOT) or sha(path.read_bytes())!=h:raise SystemExit('Foundation input digest mismatch')
 return path.read_bytes()
ui=json.loads((STAGE/'ui-manifest.json').read_text());native=json.loads((NATIVE/'manifest.json').read_text());candidate=json.loads((ROOT/'build/service-config/network-candidate/manifest.json').read_text())
if ui['schema']!=1 or native['schema']!=1 or native['libraryBuild']!=json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text()) or candidate['libraryBuild']!=native['libraryBuild']:raise SystemExit('Foundation provenance mismatch')
if sha(json.dumps(ui['inputs'],ensure_ascii=False,separators=(',',':')).encode())!=ui['sourceHash']:raise SystemExit('Foundation source manifest mismatch')
if {p.relative_to(STAGE).as_posix() for p in STAGE.rglob('*') if p.is_file()}!=set(ui['files'])|{'ui-manifest.json'}:raise SystemExit('Unexpected foundation stage file')
for name,h in ui['inputs'].items():checked(ROOT/name,h)
for name,h in native['sourceInputs'].items():checked(ROOT/name,h)
service_profile=json.loads((ROOT/'apps/tv/service-providers/bilibili-web.json').read_text())
service_bytes=(ROOT/'apps/tv/service-providers/bilibili-web.json').read_bytes()
def expand_service(value):
 return re.sub(r'\{([a-z][a-zA-Z0-9]*)(\|regex)?\}',lambda m:re.escape(service_profile['addresses'][m[1]]) if m[2] else service_profile['addresses'][m[1]],value)
service_resolved='\n'.join(expand_service(v) for v in service_profile['strings'].values()).encode()
service_profile['platformOrigins']=[expand_service(v) for v in service_profile['platformOrigins']]
service_schema_sha=sha((ROOT/'platform/wasm-network/src/service-config.h').read_bytes())
def service_marker(data,marker):
 return marker in data or marker in service_resolved
if native.get('serviceSchemaSha256')!=service_schema_sha or candidate.get('serviceSchemaSha256')!=service_schema_sha:raise SystemExit('Service configuration schema mismatch')
files={name:checked(STAGE/name,h) for name,h in ui['files'].items()}
for name,h in native['files'].items():files['identity/'+name]=checked(NATIVE/name,h)
if set(native['files'])!={'probe.js','probe.wasm','probe.data'}:raise SystemExit('Identity file mismatch')
if sha(files['identity/probe.data'])!=native['caSha256']:raise SystemExit('Identity CA mismatch')
files['identity/manifest.json']=(NATIVE/'manifest.json').read_bytes()
# ADR-108: the per-request library, catalog, search and hot-search modules are replaced by the resident kernels below and are no longer packaged.
# ADR-108: the resident public read kernel (popular, rankings, PGC lists, UP uploads, visitor, WBI search, hot words).
kernel_dir=ROOT/'build/service-config/public-kernel';kernel=json.loads((kernel_dir/'manifest.json').read_text())
if kernel.get('serviceSchemaSha256')!=service_schema_sha:raise SystemExit('Public kernel service schema mismatch')
if kernel['schema']!=1 or kernel['libraryBuild']!=native['libraryBuild'] or kernel['caSha256']!=native['caSha256'] or set(kernel['files'])!={'probe.js','probe.wasm','probe.data'}:raise SystemExit('Public kernel provenance mismatch')
for name,h in kernel['sourceInputs'].items():checked(ROOT/name,h)
# The kernel must be built from the frozen catalog-visitor (ADR-106 visitor identity), search and hot-search sources.
if not {'platform/wasm-network/src/'+n for n in ['public-kernel.c','catalog-visitor.c','catalog-ua.c','search.c','hot-search.c']}<=set(kernel['sourceInputs']):raise SystemExit('Public kernel source inputs incomplete')
for name,h in kernel['files'].items():files['public-kernel/'+name]=checked(kernel_dir/name,h)
if sha(files['public-kernel/probe.data'])!=kernel['caSha256']:raise SystemExit('Public kernel CA mismatch')
files['public-kernel/manifest.json']=(kernel_dir/'manifest.json').read_bytes()
for bad in [b'/x/player/',b'playurl',b'bilivideo',b'/x/passport',b'/qrcode',b'/heartbeat',b'/history/',b'/toview',b'/medialist',b'/fav/',b'/x/v3/',b'/x/space/',b'/x/polymer/',b'feed/rcmd',b'/x/web-interface/coin',b'/x/web-interface/like',b'/pgc/web/follow',b'/x/relation',b'live_room']:
 if bad in files['public-kernel/probe.wasm']:raise SystemExit('Public kernel unrelated route')
if any(not service_marker(files['public-kernel/probe.wasm'],marker) for marker in [b'https://api.bilibili.com/x/web-interface/popular?ps=%d&pn=%d',b'keyword=%s&page=%d&page_size=%d&search_type=%s&wts=%s',b'https://api.bilibili.com/x/web-interface/wbi/search/type?%s&w_rid=%s',b'https://s.search.bilibili.com/main/hotword',b'https://api.bilibili.com/x/frontend/finger/spi',b'KERNEL:closed']):raise SystemExit('Public kernel fixed route missing')
if b'https://api.bilibili.com/x/web-interface/search/type?' in files['public-kernel/probe.wasm']:raise SystemExit('Public kernel unsigned search forbidden')
# ADR-108 P0b: the resident account read kernel (history, favorites, follow updates, watch later, recommendations, signed category/UP).
account_dir=ROOT/'build/service-config/account-read-kernel';account_kernel=json.loads((account_dir/'manifest.json').read_text())
if account_kernel.get('serviceSchemaSha256')!=service_schema_sha:raise SystemExit('Account kernel service schema mismatch')
if account_kernel['schema']!=1 or account_kernel['libraryBuild']!=native['libraryBuild'] or account_kernel['caSha256']!=native['caSha256'] or set(account_kernel['files'])!={'probe.js','probe.wasm','probe.data'}:raise SystemExit('Account kernel provenance mismatch')
for name,h in account_kernel['sourceInputs'].items():checked(ROOT/name,h)
if not {'platform/wasm-network/src/'+n for n in ['account-read-kernel.c','library.c','recommend-read.c']}<=set(account_kernel['sourceInputs']):raise SystemExit('Account kernel source inputs incomplete')
for name,h in account_kernel['files'].items():files['account-read-kernel/'+name]=checked(account_dir/name,h)
if sha(files['account-read-kernel/probe.data'])!=account_kernel['caSha256']:raise SystemExit('Account kernel CA mismatch')
files['account-read-kernel/manifest.json']=(account_dir/'manifest.json').read_bytes()
for bad in [b'/x/player/',b'/heartbeat',b'/x/web-interface/view',b'bilivideo',b'/x/passport',b'/qrcode',b'/toview/del',b'/toview/add',b'/history/delete',b'/history/clear',b'/history/report',b'/fav/resource/deal',b'/fav/folder/add',b'/fav/folder/del',b'/dynamic/create',b'/pgc/web/follow',b'/x/relation',b'/x/web-interface/coin',b'/x/web-interface/like']:
 if bad in files['account-read-kernel/probe.wasm']:raise SystemExit('Account kernel unrelated route')
if any(not service_marker(files['account-read-kernel/probe.wasm'],marker) for marker in [b'ps=%d&desc=true&otype=2',b'biz_id=%s&ps=%d&desc=true',b'/x/web-interface/wbi/index/top/feed/rcmd',b'/x/web-interface/history/cursor',b'ranking/v2?rid=0&type=all',b'AUTH:closed']):raise SystemExit('Account kernel fixed route missing')
if sha(files['search-words.json'])!='c723c86e502613bdaf3c613b5638ece0fe38772d92165b48f2d3ca140ba3256b' or sha(files['search-NOTICE'])!='b5830d96fb5a7e7e7ebcc295f352846b4b998e78fdc8f9aa68e134d2e4b39986':raise SystemExit('Search dictionary/license mismatch')
media_files,media_manifest,_,_=load_candidate()
for name,data in media_files.items():files['native/'+name]=data
files['native/manifest.json']=(json.dumps(media_manifest,indent=2)+'\n').encode()
for name,h in candidate['licenses'].items():files['third-party-licenses/'+name]=checked(ROOT/'build/service-config/network-candidate/licenses'/name,h)
qr=json.loads((ROOT/'platform/third-party/qrcode-generator.lock.json').read_text())
# Original pinned QR license retained; npm dependency is already in the lockfile.
files['third-party-licenses/qrcode-generator-MIT.txt']=checked(ROOT/'platform/third-party/qrcode-generator-LICENSE.txt',qr['licenseSha256'])
checked(ROOT/'node_modules/qrcode-generator'/qr['runtime'],qr['runtimeSha256'])
# W04 runtime directories are explicit and independently paired to their exact
# source/output manifests. No fallback to the old probe or another build folder.
w04_manifests={}
expected_csp=b"default-src 'none'; script-src 'self' 'wasm-unsafe-eval' file://wgt-widget/; worker-src 'self'; child-src 'self'; style-src 'self'; connect-src 'self' http://127.0.0.1:40324 http://127.0.0.1:40325; media-src http://127.0.0.1:40324 http://127.0.0.1:40325; object-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'"
expected_csp=expected_csp.replace(b"; media-src",(' '+' '.join(service_profile['platformOrigins'])+'; media-src').encode()).replace(b"img-src 'self'",b"img-src 'self' blob:")
policies=re.findall(rb'<meta http-equiv="Content-Security-Policy" content="([^"]*)">',files['index.html'])
if policies!=[expected_csp]:raise SystemExit('W04 CSP mismatch')
required={
 'vod':[b'https://www.bilibili.com/video/%s'],
 'vod-api':[b'https://api.bilibili.com/x/web-interface/view?bvid=%s',b'https://api.bilibili.com/x/player/wbi/playurl?%s&w_rid=%s'],
 'pgc-read':[b'/pgc/view/web/season?season_id=%s',b'/pgc/player/web/playurl?cid=%s&ep_id=%s&fnval=4048&fnver=0&fourk=1&qn=127'],
 'pgc-follow':[(b'/pgc/view/web/season/user/status?season_id=%s'),b'/pgc/web/follow/%s',b'/x/space/bangumi/follow/list?%s&w_rid=%s',b'season_id=%s&csrf=%s'],
 'live-read':[b'/xlive/web-ucenter/user/following?page=%s&page_size=9&ignoreRecord=1&hit_ab=false',b'/xlive/web-room/v1/dM/gethistory?roomid=%s&room_type=0',b'/room/v1/area/getList',b'/xlive/web-interface/v1/second/getList?%s&w_rid=%s'],
 'live-product':[b'/xlive/web-room/v2/index/getRoomPlayInfo?room_id=%s&protocol=1&format=1&codec=0&qn=%s&platform=web&ptype=8',b'LIVE:relay_ready']}
required['cast-product']=[b'<friendlyName>BiliSofa</friendlyName>',b'TVReceiver/1',b'cast.mp4',b'CAST:transition:closed']
required['overlay-read']=[b'/x/player/wbi/v2',b'/x/v2/dm/wbi/web/seg.so',b'oid=%s&pid=%s&segment_index=%s&type=1&wts=%s',b'https://aisubtitle.hdslb.com/',b'/bfs/subtitle/',b'/pgc/view/web/season?season_id=%s']
required['video-interactions']=[b'/x/web-interface/archive/relation?aid=%s',b'/x/v3/fav/folder/created/list-all?type=2&rid=%s&up_mid=%s',b'/x/relation?fid=%s',b'/x/v2/history/toview',b'/x/web-interface/archive/like',b'/x/v3/fav/resource/deal',b'/x/v2/history/toview/%s',b'/x/relation/modify',b'/x/web-interface/coin/add',b'aid=%s&multiply=%s&select_like=0&csrf=%s',b'rid=%s&type=2&%s_media_ids=%s&csrf=%s',b'fid=%s&act=%d&re_src=14&csrf=%s']
required['comments-read']=[b'/x/v2/reply/wbi/main?%s&w_rid=%s',b'mode=%s&oid=%s&pagination_str=%s&plat=1&seek_rpid=0&type=1&web_location=1315875&wts=%s',b'/x/v2/reply/reply?oid=%s&pn=%s&ps=10&root=%s&type=1']
for folder,markers in required.items():
 # 0.47.2 packages the relinked overlay module; earlier frozen folders stay untouched. 0.50.3 packages the failover bridge; 0.50.4 the failover source modules.
 directory=ROOT/'build/service-config'/('vod-api-failover' if folder=='vod-api' else 'pgc-read-failover' if folder=='pgc-read' else 'vod-failover' if folder=='vod' else 'overlay-read-subtitle' if folder=='overlay-read' else 'pgc-follow-status' if folder=='pgc-follow' else folder);path=directory/'manifest.json';module=json.loads(path.read_text())
 if module.get('serviceSchemaSha256')!=service_schema_sha:raise SystemExit('Native service slot schema mismatch')
 if module['schema']!=1 or module['libraryBuild']!=native['libraryBuild'] or module['caSha256']!=native['caSha256'] or set(module['files'])!={'probe.js','probe.wasm','probe.data'}:raise SystemExit('W04 native provenance mismatch: '+folder)
 for name,h in module['sourceInputs'].items():checked(ROOT/name,h)
 for name,h in module['files'].items():files[folder+'/'+name]=checked(directory/name,h)
 data=files[folder+'/probe.wasm'];script=files[folder+'/probe.js']
 if sha(files[folder+'/probe.data'])!=module['caSha256'] or data[:8]!=b'\0asm\1\0\0\0' or re.search(rb'\beval\s*\(|new Function',script):raise SystemExit('W04 native runtime policy mismatch: '+folder)
 if any(not service_marker(data,marker) for marker in markers):raise SystemExit('W04 native fixed route missing: '+folder)
 forbidden=[b'/heartbeat',b'/x/passport',b'/qrcode',b'/toview/add',b'/toview/del',b'/history/report',b'/history/delete',b'/fav/resource/deal',b'/dynamic/create',b'/x/web-interface/coin',b'/x/web-interface/like']
 if folder=='video-interactions':forbidden=[x for x in forbidden if x not in [b'/toview/add',b'/toview/del',b'/fav/resource/deal',b'/x/web-interface/coin']]+[b'/x/v2/dm/post',b'/x/v2/reply/add',b'/x/v2/reply/del',b'/x/v2/reply/like',b'/x/v2/reply/action',b'/archive/like/triple']
 if folder=='cast-product' and module.get('policy',{}).get('cumulativeProbeQuotas') is not False:raise SystemExit('Cast product still has probe quotas')
 if folder in ['overlay-read','comments-read','video-interactions','cast-product','recommend']:forbidden+=[b'/x/v2/dm/post',b'/x/v2/reply/add',b'/x/v2/reply/del']
 if folder=='comments-read':forbidden+=[b'/x/v2/dm/',b'/x/v2/reply/like',b'/x/v2/reply/action',b'/x/v2/reply/report']
 if folder!='pgc-follow':forbidden+=[b'/pgc/web/follow/']
 if any(bad in data for bad in forbidden):raise SystemExit('W04 native unrelated route: '+folder)
 if folder=='vod' and module.get('policy',{}).get('cumulativeProbeQuotas') is not False:raise SystemExit('W04 bridge still has probe quotas')
 if folder=='vod' and (module.get('policy',{}).get('failoverPerTrack')!=1 or b'BRIDGE:failover:%d' not in data or not service_marker(data,b'mirrorakam.akamaized.net')):raise SystemExit('0.50.3 bridge failover missing')
 if folder in ['vod-api','pgc-read'] and (not service_marker(data,b'mirrorakam.akamaized.net') or 'media-backup-cdn' not in module.get('policy',{}).get('sourceCheckHosts',[])):raise SystemExit('0.50.4 source check failover missing: '+folder)
 files[folder+'/manifest.json']=path.read_bytes();w04_manifests[folder]=sha(path.read_bytes())
xml=ET.fromstring(files['config.xml']);ns={'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'};app=xml.find('t:application',ns)
if app.attrib['id']!='BiliSofa01.TV' or app.attrib['package']!='BiliSofa01' or xml.attrib['version']!=version or xml.find('w:content',ns).attrib['src']!='index.html':raise SystemExit('Foundation identity mismatch')
if {x.attrib['name'] for x in xml.findall('t:privilege',ns)}!=({'http://tizen.org/privilege/internet'}|({'http://developer.samsung.com/privilege/productinfo'})|({'http://tizen.org/privilege/tv.inputdevice'})) or [x.attrib for x in xml.findall('w:access',ns)]!=[{'origin':'http://127.0.0.1:40324','subdomains':'false'}]+([{'origin':'http://127.0.0.1:40325','subdomains':'false'}])+([{'origin':origin,'subdomains':'false'} for origin in service_profile['platformOrigins']]):raise SystemExit('Foundation network privilege mismatch')
if set(ui['files'])!=({'cast-product-worker.js','service-bootstrap.js','service-providers/catalog.json','service-providers/bilibili-web.json'})|({'overlay-worker.js','comments-worker.js','interaction-worker.js'})|({'vod-source-worker.js','vod-bridge-worker.js','pgc-follow-worker.js','live-product-worker.js'})|({'public-kernel-worker.js','account-read-kernel-worker.js'})|{'app.js','initials-worker.js','search-words.json','search-NOTICE','identity-worker.js','guest-video-worker.js','cast-worker.js','index.html','style.css','config.xml','icon.png','LICENSE','THIRD_PARTY_NOTICES.md'}:raise SystemExit('Foundation UI allowlist mismatch')
for name,data in files.items():
 if name.startswith('/') or '..' in Path(name).parts or any(p in data for p in [b'/Users/',b'-----BEGIN PRIVATE KEY-----',b'SESSDATA=',b'bili_jct=']):raise SystemExit('Foundation private or unsafe payload')
for bad in [b'/x/player/',b'/heartbeat',b'BV14GHy6bE9n',b'/x/web-interface/view']:
 if bad in files['identity/probe.wasm'] or bad in files['identity-worker.js']:raise SystemExit('Foundation includes probe/progress routes')
if any(b'new Function' in files[name] for name in ['identity/probe.js','native/probe.js','public-kernel/probe.js','account-read-kernel/probe.js']) or b"connect-src 'self'" not in files['index.html']:raise SystemExit('Foundation runtime policy mismatch')
files['build.json']=(json.dumps({'schema':1,'identity':'BiliSofa01.TV','version':version,'publicKernelManifest':kernel,'accountKernelManifest':account_kernel,'w06NativeManifests':{k:v for k,v in w04_manifests.items() if k=='cast-product'},'w04NativeManifests':{k:v for k,v in w04_manifests.items() if k not in ['overlay-read','comments-read','video-interactions','cast-product','recommend']},'w05NativeManifests':{k:v for k,v in w04_manifests.items() if k in ['overlay-read','comments-read','video-interactions']},'purpose':('U2 account/settings and U3 shared player/read layers; earlier capabilities retained; device acceptance OPEN; ')+'W03 local identity playback queue and verified-account read-only follow updates, favorites, history and watch-later lists with existing category/search/media/cast; unsigned; not product/device acceptance','serviceConfiguration':{'schema':1,'profileSha256':sha(service_bytes),'nativeSchemaSha256':service_schema_sha,'requiresUserSelection':True},'uiSourceHash':ui['sourceHash'],'nativeManifestSha256':sha((NATIVE/'manifest.json').read_bytes()),'mediaNativeManifestSha256':sha(files['native/manifest.json']),'qrDependency':qr,'files':{n:sha(v) for n,v in sorted(files.items())}},indent=2)+'\n').encode()
package=ROOT/('dist/BiliSofa-'+version+'-unsigned.wgt')
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(files.items()):
  info=zipfile.ZipInfo(name,(2026,10,17,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)
with zipfile.ZipFile(package) as z:
 if set(z.namelist())!=set(files) or any(z.read(n)!=data for n,data in files.items()):raise SystemExit('Foundation archive differs')
package.with_suffix('.wgt.sha256').write_text(sha(package.read_bytes())+'  '+package.name+'\n')
print('U5 '+version+' unsigned WGT verified '+sha(package.read_bytes())+'; not installed/device accepted')

from pathlib import Path
import hashlib,json,zipfile,xml.etree.ElementTree as ET,sys
root=Path(__file__).resolve().parents[1]
isolationMode='--isolation' in sys.argv[1:]
nativeMode='--native' in sys.argv[1:] or isolationMode
package=root/('dist/BiliSofa-W01-isolation-unsigned.wgt' if isolationMode else 'dist/BiliSofa-W01-native-unsigned.wgt' if nativeMode else 'dist/BiliSofa-W01-basic-unsigned.wgt')
if not package.exists(): raise SystemExit('Missing unsigned WGT')
with zipfile.ZipFile(package) as archive:
 names=set(archive.namelist())
 if 'config.xml' not in names or 'index.html' not in names or 'probe.wasm' not in names: raise SystemExit('Invalid package root')
 if any('..' in Path(name).parts or name.startswith('/') for name in names): raise SystemExit('Unsafe ZIP path')
 if any(Path(name).suffix in {'.pem','.p12','.key','.map','.ts'} for name in names): raise SystemExit('Private/source file bundled')
 xml=ET.fromstring(archive.read('config.xml'))
 ns={'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'}
 if xml.find('w:content',ns).attrib['src'] not in names: raise SystemExit('Missing entry point')
 if xml.find('t:application',ns).attrib['id']!=('BiliIsola1.Probe' if isolationMode else 'BiliProbe1.Probe'): raise SystemExit('Invalid identity')
 if xml.find('t:application',ns).attrib.get('package')!=('BiliIsola1' if isolationMode else 'BiliProbe1'): raise SystemExit('Invalid package namespace')
 if hashlib.sha256(archive.read('search-words.json')).hexdigest()!='c723c86e502613bdaf3c613b5638ece0fe38772d92165b48f2d3ca140ba3256b' or hashlib.sha256(archive.read('search-NOTICE')).hexdigest()!='b5830d96fb5a7e7e7ebcc295f352846b4b998e78fdc8f9aa68e134d2e4b39986': raise SystemExit('Search data/license mismatch')
 if {item.attrib.get('origin') for item in xml.findall('w:access',ns)} != {'http://127.0.0.1:40323','http://127.0.0.1:40324'} or any(item.attrib.get('subdomains')!='false' for item in xml.findall('w:access',ns)): raise SystemExit('Loopback WARP boundary mismatch')
 if {item.attrib.get('name') for item in xml.findall('t:privilege',ns)} != {'http://tizen.org/privilege/internet','http://developer.samsung.com/privilege/productinfo'}: raise SystemExit('Unexpected probe privilege')
 html=archive.read('index.html').decode()
 build=json.loads(archive.read('build.json'))
 if build.get('automation') not in (['synthetic-cross-package-read-report-once'] if isolationMode else ['manual','guest-synthetic-report-once','synthetic-persistence-report-once','guest-popular-report-once','guest-video-source-report-once','cast-startup-report-once']) or f'<meta name="probe-auto" content="{3 if isolationMode else 6 if build["automation"]=="cast-startup-report-once" else 5 if build["automation"]=="guest-video-source-report-once" else 4 if build["automation"]=="guest-popular-report-once" else 2 if build["automation"]=="synthetic-persistence-report-once" else 1 if build["automation"]=="guest-synthetic-report-once" else 0}">' not in html: raise SystemExit('Automation mode identity mismatch')
 if isolationMode and (build.get('identity')!='BiliIsola1.Probe' or build.get('observerBundleSha256')!=hashlib.sha256(archive.read('app.js')).hexdigest()): raise SystemExit('Observer bundle identity/hash mismatch')
 if build.get('searchWords',{}).get('commit')!='49aebad1c1cfbbcaa9288ffed5161e79e57c3679' or build['searchWords'].get('rows')!=64816 or build['searchWords'].get('sha256')!=hashlib.sha256(archive.read('search-words.json')).hexdigest(): raise SystemExit('Search data provenance mismatch')
 if build['sourceHash'] not in html or build['native']!=nativeMode: raise SystemExit('Build identity mismatch')
 if nativeMode:
  if xml.attrib['version']!='0.0.38' or build['version']!='0.0.38': raise SystemExit('Native internal package version mismatch')
  manifest=json.loads(archive.read('native/manifest.json'))
  licenseManifest=json.loads(archive.read('third-party-licenses/manifest.json'))
  for prefix,items in [('native/',manifest['files']),('third-party-licenses/',licenseManifest['files'])]:
   for name,digest in items.items():
    if hashlib.sha256(archive.read(prefix+name)).hexdigest()!=digest: raise SystemExit('Bundled native/license hash mismatch')
  if archive.read('native/probe.wasm')[:8]!=b'\0asm\1\0\0\0': raise SystemExit('Native artifact is not WASM')
  runtime=archive.read('native/probe.js').decode()
  if any(name not in runtime for name in ['_cast_source_buffer','_cast_source_begin','_cast_media_begin']): raise SystemExit('Native source test export missing')
  payload=archive.read('native/probe.data');layout=manifest.get('dataLayout',[])
  mediaFiles=manifest.get('mediaFiles',{})
  expectedNames=['/cacert.pem']+['/probe-media/'+name for name in sorted(mediaFiles)]
  if [item.get('name') for item in layout]!=expectedNames: raise SystemExit('Unexpected CA/media data layout')
  offset=0
  for item in layout:
   start,end=item.get('start'),item.get('end')
   if type(start)!=int or type(end)!=int or start!=offset or end<=start or end>len(payload) or end-start>256*1024: raise SystemExit('Invalid CA/media data bounds')
   expectedDigest=manifest['caSha256'] if item['name']=='/cacert.pem' else mediaFiles[item['name'].removeprefix('/probe-media/')]
   if item.get('sha256')!=expectedDigest or hashlib.sha256(payload[start:end]).hexdigest()!=expectedDigest: raise SystemExit('CA/media data hash mismatch')
   offset=end
  if offset!=len(payload): raise SystemExit('Unexpected extra data bytes')
 for name in names:
  if Path(name).suffix in {'.js','.html','.xml','.json'}:
   data=archive.read(name).decode()
   if any(item in data for item in ['-----BEGIN PRIVATE KEY-----','-----BEGIN RSA PRIVATE KEY-----','SESSDATA=','bili_jct=','http://localhost:4173']): raise SystemExit('Private data/dev dependency pattern')
 digest=hashlib.sha256(package.read_bytes()).hexdigest()
 if package.with_suffix('.wgt.sha256').read_text().split()[0]!=digest: raise SystemExit('Package hash mismatch')
print(('Native' if nativeMode else 'Basic')+' unsigned package integrity/boundaries passed; not a signature/device test')

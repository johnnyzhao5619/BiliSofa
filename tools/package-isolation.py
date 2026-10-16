"""Separate read-only observer WGT, reusing the verified local HTTP Worker.
Never changes the owner's identity; signing/deployment remain explicit.
"""
from pathlib import Path
import hashlib,json,subprocess,zipfile
root=Path(__file__).resolve().parents[1]
subprocess.run(['python3',str(root/'tools/verify-package.py'),'--native'],check=True)
with zipfile.ZipFile(root/'dist/BiliSofa-W01-native-unsigned.wgt') as z: files={name:z.read(name) for name in z.namelist()}
build=json.loads(files['build.json']);bundle=root/'build/isolation/app.js';manifest=json.loads((bundle.parent/'manifest.json').read_text())
if manifest['sourceHash']!=build['sourceHash'] or hashlib.sha256(bundle.read_bytes()).hexdigest()!=manifest['sha256']: raise SystemExit('Observer bundle source/hash mismatch: rebuild')
files['app.js']=bundle.read_bytes()
files['config.xml']=files['config.xml'].decode().replace('https://bilisofa.invalid/probe','https://bilisofa.invalid/isolation').replace('BiliProbe1','BiliIsola1').replace('BiliSofa W01 Probe','BiliSofa W01 Isolation').encode()
base=files['index.html'].decode();head=base[:base.index('<body>')].replace('name="probe-auto" content="0"','name="probe-auto" content="3"').replace('name="probe-auto" content="1"','name="probe-auto" content="3"').replace('name="probe-auto" content="2"','name="probe-auto" content="3"').replace('name="probe-auto" content="4"','name="probe-auto" content="3"').replace('name="probe-auto" content="5"','name="probe-auto" content="3"').replace('name="probe-auto" content="6"','name="probe-auto" content="3"').replace('BiliSofa · W01 探针','BiliSofa · W01 隔离观察')
files['index.html']=(head+'''<body><main><header><h1>W01 · 跨包合成数据观察</h1><p>只尝试读取主探针的一条合成数据；不保存或删除其他包数据。</p></header><section class="actions"><button id="stop" data-focus-id="stop">停止报告</button><button id="export" data-focus-id="export">查看脱敏记录</button></section><p id="status" role="status"></p><textarea id="export-output" data-focus-id="export-output" data-return-focus-id="export" hidden readonly aria-label="脱敏探针结果"></textarea><p>观察到无法读取仍需主探针再次证明数据存在。</p></main><section id="exit-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title" hidden><h2 id="exit-title">退出隔离观察？</h2><button id="cancel-exit" data-focus-id="cancel-exit">继续</button><button id="confirm-exit" data-focus-id="confirm-exit">退出</button></section></body></html>''').encode()
build['automation']='synthetic-cross-package-read-report-once';build['identity']='BiliIsola1.Probe';build['observerBundleSha256']=manifest['sha256'];files['build.json']=(json.dumps(build,indent=2)+'\n').encode()
out=root/'dist/probe-isolation';out.mkdir(parents=True,exist_ok=True)
for name,data in files.items():
 p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
if {str(p.relative_to(out)) for p in out.rglob('*') if p.is_file()}!=set(files):raise SystemExit('Unexpected observer stage files')
package=root/'dist/BiliSofa-W01-isolation-unsigned.wgt'
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(files.items()):
  info=zipfile.ZipInfo(name,(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)
digest=hashlib.sha256(package.read_bytes()).hexdigest();package.with_suffix('.wgt.sha256').write_text(f'{digest}  {package.name}\n')
print('UNSIGNED ISOLATION OBSERVER '+str(package)+'\nSHA-256 '+digest)

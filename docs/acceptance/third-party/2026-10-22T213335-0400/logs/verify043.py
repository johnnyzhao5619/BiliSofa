import json, hashlib, sys, zipfile, tarfile, os
root, wgt, src = sys.argv[1], sys.argv[2], sys.argv[3]
h = lambda b: hashlib.sha256(b).hexdigest()
m = json.load(open(os.path.join(root, 'dist/product-cast-clock-app/ui-manifest.json')))
def val(v): return v if isinstance(v, str) else (v.get('sha256') or v.get('hash'))
# dist files vs manifest
bad = [f for f, v in m['files'].items() if h(open(os.path.join(root, 'dist/product-cast-clock-app', f), 'rb').read()) != val(v)]
print('dist files', len(m['files']), 'mismatch', bad)
# inputs vs current workspace
changed, missing = [], []
for f, v in m['inputs'].items():
    p = os.path.join(root, f)
    if not os.path.exists(p): missing.append(f); continue
    if h(open(p, 'rb').read()) != val(v): changed.append(f)
print('inputs', len(m['inputs']), 'changed_in_workspace', len(changed), 'missing', len(missing))
for f in changed: print('  CHANGED', f)
for f in missing: print('  MISSING', f)
# wgt contents vs dist
z = zipfile.ZipFile(wgt)
names = z.namelist()
print('wgt entries', len(names))
dist_cmp = {f: (h(z.read(f)) == val(v)) if f in names else None for f, v in m['files'].items()}
print('wgt-vs-manifest mismatches', [f for f, ok in dist_cmp.items() if ok is False], 'absent', [f for f, ok in dist_cmp.items() if ok is None])
print('wgt extra (non-dist) count', len([n for n in names if n not in m['files']]), sorted({n.split('/')[0] for n in names if n not in m['files']})[:30])
print('suspicious names', [n for n in names if n.startswith('/') or '..' in n])
# source archive
t = tarfile.open(src)
mem = [x for x in t.getmembers() if x.isfile()]
print('src archive files', len(mem), 'unsafe', [x.name for x in t.getmembers() if x.name.startswith('/') or '..' in x.name][:5])
names2 = {x.name.lstrip('./'): x for x in mem}
inter = [f for f in m['inputs'] if f in names2 or ('source/'+f) in names2]
print('manifest inputs present in archive', len(inter))
print('archive top-level', sorted({n.split('/')[0] for n in names2})[:20])

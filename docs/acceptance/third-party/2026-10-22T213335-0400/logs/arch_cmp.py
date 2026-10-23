import tarfile, hashlib, sys, os
root, src = sys.argv[1], sys.argv[2]
t = tarfile.open(src); diff=[]; miss=[]; same=0
for x in t.getmembers():
    if not x.isfile(): continue
    n = x.name.lstrip('./')
    if n.startswith('node_modules/') or n.startswith('evidence/'): continue
    p = os.path.join(root, n)
    if not os.path.exists(p): miss.append(n); continue
    a = hashlib.sha256(t.extractfile(x).read()).hexdigest(); b = hashlib.sha256(open(p,'rb').read()).hexdigest()
    if a==b: same+=1
    else: diff.append(n)
print('same',same,'diff',len(diff),'missing',len(miss)); [print(' DIFF',d) for d in diff]; [print(' MISS',d) for d in miss]
print('evidence members', [x.name for x in t.getmembers() if 'evidence' in x.name][:10])

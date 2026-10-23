import zipfile, re, sys
z = zipfile.ZipFile(sys.argv[1]); pats = [rb'SESSDATA=[A-Za-z0-9%]{8,}', rb'bili_jct=[a-f0-9]{16,}', rb'-----BEGIN (RSA |EC )?PRIVATE KEY', rb'DedeUserID=[0-9]{3,}', rb'192\.168\.\d+\.\d+', rb'\b10\.\d+\.\d+\.\d+\b', rb'access_key=[a-f0-9]{16,}']
hits = {}
for n in z.namelist():
    d = z.read(n)
    for p in pats:
        if re.search(p, d): hits.setdefault(p.decode()[:20], []).append(n)
print('hits', {k: v[:5] for k, v in hits.items()})
print('license files', [n for n in z.namelist() if re.search(r'(LICENSE|NOTICE|third-party-licenses)', n)][:20])

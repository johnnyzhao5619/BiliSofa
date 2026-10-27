"""Verified modern probe inputs for the explicit main-media experiment (ADR-016)."""
from pathlib import Path
import hashlib, json, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
CA_SHA256 = 'a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505'

def digest(data): return hashlib.sha256(data).hexdigest()

def checked(path, expected):
  if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
    raise SystemExit('Unsafe modern network input')
  data = path.read_bytes()
  if digest(data) != expected: raise SystemExit('Modern network input digest mismatch: ' + path.name)
  return data

def load_candidate():
  subprocess.run([sys.executable, str(ROOT/'tools/build-network-candidate.py'), 'check'], check=True)
  base = ROOT/'build/service-config/network-candidate'
  candidate = json.loads((base/'manifest.json').read_text())
  if candidate['libraryBuild'] != json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text()):
    raise SystemExit('Modern linked libraries are stale')
  for name, expected in candidate['sourceInputs'].items(): checked(ROOT/name, expected)
  files = {name: checked(base/'probe'/name, candidate['outputs']['probe/'+name])
           for name in ['probe.js', 'probe.wasm', 'probe.data']}
  licenses = {name: checked(base/'licenses'/name, expected) for name, expected in candidate['licenses'].items()}
  media = ROOT/'build/media-probe'
  media_manifest = json.loads((media/'manifest.json').read_text())
  media_files = {n: h for n, h in media_manifest['files'].items() if n != 'probe.mp4'}
  inputs = [('/cacert.pem', checked(ROOT/'.local/cacert.pem', CA_SHA256))]
  inputs += [('/probe-media/'+n, checked(media/n, media_files[n])) for n in sorted(media_files)]
  if files['probe.data'] != b''.join(data for _, data in inputs):
    raise SystemExit('Modern CA/media payload differs from verified inputs')
  layout = []; offset = 0
  for name, data in inputs:
    layout.append({'name': name, 'start': offset, 'end': offset+len(data), 'sha256': digest(data)})
    offset += len(data)
  source_names = ['probe.c','probe-http.h','probe-media.h','probe-service.h','probe-guest.h','probe-bridge.h','probe-cast.h','probe-cast-source.h','probe-session.h']
  manifest = {'schema': 1, 'files': {n: digest(d) for n, d in files.items()},
    'compilerVersion': candidate['libraryBuild']['compilerVersion'], 'caSha256': CA_SHA256,
    'sourceSha256': digest(b''.join((ROOT/'platform/wasm-network/src'/n).read_bytes() for n in source_names)),
    'mediaFiles': media_files, 'dataLayout': layout, 'networkCandidate': candidate,
    'candidate': 'W01-modern-media-not-credential-approved'}
  license_manifest = {'files': candidate['licenses'], 'versions': candidate['dependencies']}
  return files, manifest, licenses, license_manifest

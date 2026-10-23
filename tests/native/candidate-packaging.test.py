"""Exercise actual candidate provenance gates without editing artifacts or source."""
from pathlib import Path
import importlib.util, json, unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('candidate_native', ROOT/'tools/candidate_native.py')
candidate = importlib.util.module_from_spec(spec); spec.loader.exec_module(candidate)

class CandidatePackaging(unittest.TestCase):
  def test_verified_full_probe_and_ca_media(self):
    files, manifest, licenses, license_manifest = candidate.load_candidate()
    self.assertEqual(manifest['networkCandidate']['dependencies'], {'curl':'8.23.0','openssl':'3.5.9','zlib':'not-linked'})
    self.assertEqual(files['probe.wasm'][:8], b'\0asm\1\0\0\0')
    self.assertEqual(set(licenses), set(license_manifest['files']))
    self.assertEqual(manifest['dataLayout'][-1]['end'], len(files['probe.data']))
    self.assertIn('OpenSSL-3-LICENSE.txt', licenses)
    self.assertNotIn('OpenSSL-LICENSE.txt', licenses)

  def reject_changed(self, target):
    original = Path.read_bytes
    def read_bytes(path):
      data = original(path)
      return data+b'changed' if path == ROOT/target else data
    with patch.object(Path, 'read_bytes', read_bytes), self.assertRaises(SystemExit):
      candidate.load_candidate()

  def test_changed_final_wasm_is_rejected(self):
    self.reject_changed('build/network-candidate/probe/probe.wasm')

  def test_changed_c_source_is_rejected(self):
    self.reject_changed('platform/wasm-network/src/probe-cast.h')

  def test_changed_license_is_rejected(self):
    self.reject_changed('build/network-candidate/licenses/OpenSSL-3-LICENSE.txt')

  def test_changed_synthetic_media_is_rejected(self):
    self.reject_changed('build/media-probe/init-0.mp4')

  def test_stale_linked_libraries_are_rejected(self):
    original = Path.read_text
    def read_text(path, *args, **kwargs):
      text = original(path, *args, **kwargs)
      if path == ROOT/'build/network-candidate/manifest.json':
        value = json.loads(text); value['libraryBuild']['recipeSha256'] = '0'*64
        return json.dumps(value)
      return text
    with patch.object(Path, 'read_text', read_text), self.assertRaises(SystemExit):
      candidate.load_candidate()

if __name__ == '__main__': unittest.main()

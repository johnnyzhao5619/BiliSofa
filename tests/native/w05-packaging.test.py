"""W05 inherits the existing whole-package gates and adds read-only overlay gates."""
from pathlib import Path
import hashlib
import importlib.util
import json
import subprocess
import unittest

spec = importlib.util.spec_from_file_location('w04_package_gates', Path(__file__).with_name('w04-packaging.test.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ROOT = module.ROOT
module.base.STAGE = ROOT / 'dist/w05-app'
module.base.PACKAGE = ROOT / 'dist/BiliSofa-W05-interactions-unsigned.wgt'


class W05Packaging(module.W04Packaging):
    def test_w04_cannot_be_relabeled_as_previous_version(self):
        path = module.base.STAGE / 'config.xml'
        manifest = module.base.STAGE / 'ui-manifest.json'
        saved, original = manifest.read_bytes(), path.read_bytes()
        try:
            self.assertIn(b'0.24.1', original)
            path.write_bytes(original.replace(b'0.24.1', b'0.21.4'))
            ui = json.loads(saved)
            ui['files']['config.xml'] = hashlib.sha256(path.read_bytes()).hexdigest()
            manifest.write_text(json.dumps(ui))
            self.rejected('Foundation identity mismatch')
        finally:
            path.write_bytes(original)
            manifest.write_bytes(saved)

    def rejected(self, expected):
        before = hashlib.sha256(module.base.PACKAGE.read_bytes()).hexdigest()
        result = subprocess.run(['python3', 'tools/package-foundation-app.py', '--w05'], cwd=ROOT, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(expected, result.stdout + result.stderr)
        self.assertEqual(hashlib.sha256(module.base.PACKAGE.read_bytes()).hexdigest(), before)

    def test_overlay_requires_same_library_and_ca(self):
        self.module('overlay-read', None, 'W04 native provenance mismatch', lambda m: m.update(caSha256='0' * 64))

    def test_overlay_cannot_fall_back_to_unsigned_legacy_danmaku_route(self):
        self.module('overlay-read', lambda b: b.replace(b'/x/v2/dm/wbi/web/seg.so', b'/x/v2/dm/bad/web/seg.so'), 'W04 native fixed route missing')

    def test_overlay_danmaku_or_comment_write_cannot_be_added_by_rehash(self):
        for marker in [b'/x/v2/dm/post', b'/x/v2/reply/add', b'/x/v2/reply/del']:
            with self.subTest(marker=marker):
                self.module('overlay-read', lambda b: b + marker, 'W04 native unrelated route')

    def test_comment_lane_requires_exact_source_and_ca(self):
        self.module('comments-read', None, 'W04 native provenance mismatch', lambda m: m.update(caSha256='0' * 64))

    def test_comment_lane_cannot_drop_current_signed_root_or_fixed_reply_routes(self):
        self.module('comments-read', lambda b: b.replace(b'/x/v2/reply/wbi/main', b'/x/v2/reply/bad/main'), 'W04 native fixed route missing')
        self.module('comments-read', lambda b: b.replace(b'ps=10&root=%s&type=1', b'ps=99&root=%s&type=1'), 'W04 native fixed route missing')

    def test_comment_lane_cannot_gain_any_comment_write(self):
        for route in [b'/x/v2/reply/add', b'/x/v2/reply/del', b'/x/v2/reply/like', b'/x/v2/reply/action', b'/x/v2/reply/report']:
            with self.subTest(route=route):
                self.module('comments-read', lambda b: b + route, 'W04 native unrelated route')

    def test_interaction_lane_requires_its_exact_ca_and_post_fields(self):
        self.module('video-interactions', None, 'W04 native provenance mismatch', lambda m: m.update(caSha256='0' * 64))
        self.module('video-interactions', lambda b: b.replace(b'select_like=0',b'select_like=1'), 'W04 native fixed route missing')

    def test_interaction_lane_cannot_gain_comment_history_or_dedicated_opaque_triple_writes(self):
        for route in [b'/x/v2/reply/add',b'/x/v2/reply/like',b'/history/report',b'/archive/like/triple']:
            with self.subTest(route=route):
                self.module('video-interactions', lambda b: b + route, 'W04 native unrelated route')

    def test_readonly_comment_lane_cannot_gain_interaction_post(self):
        self.module('comments-read', lambda b: b + b'/x/web-interface/coin/add', 'W04 native unrelated route')

if __name__ == '__main__':
    unittest.main()

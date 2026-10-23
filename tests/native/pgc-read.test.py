"""PGC fixed reads plus inherited TLS/cookie/body/closure negative checks."""
from pathlib import Path
import importlib.util
import unittest
spec = importlib.util.spec_from_file_location('vod_api_fixture_tests', Path(__file__).with_name('vod-api.test.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PgcReadTest(module.VodApiTest):
    fixture = 'tests/native/pgc-read-fixture.c'

    def test_fixed_season_and_episode_routes_retain_two_jar_isolation(self):
        paths = ['/pgc/view/web/season?season_id=123', '/pgc/player/web/playurl?cid=789&ep_id=456&fnval=4048&fnver=0&fourk=1&qn=127']
        requests, output = self.case('pgc', paths)
        self.assertEqual(requests[1:3], paths)
        self.assertEqual(len(requests), 5)
        self.assertIn(b'VODAPI:response:4', output)
        self.assertIn(b'VODAPI:response:5', output)

    def test_pgc_identifiers_cannot_be_urls_queries_headers_or_overflow(self):
        self.assertEqual(self.case('pgc-bounds')[0], [])


if __name__ == '__main__':
    unittest.main()

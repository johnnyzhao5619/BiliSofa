"""ADR-105 public-read entry: the inherited VOD read-lane checks (TLS, cookie jars, redirect,
bounds, close), plus its only routes: signed nav, one category ranking and one UP page."""
from pathlib import Path
import importlib.util
import unittest
spec = importlib.util.spec_from_file_location('vod_api_fixture_tests', Path(__file__).with_name('vod-api.test.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PublicReadTest(module.VodApiTest):
    fixture = 'tests/native/public-read-fixture.c'

    def test_verified_api_jar_wbi_and_two_anonymous_cdn_reads(self):
        """Replaced: this entry has no CDN or playurl route; the normal path is nav, ranking, UP page."""
        paths = ['/x/web-interface/ranking/v2?rid=1005&type=all', '/x/series/recArchivesByKeywords?mid=12345&keywords=&ps=30&pn=2']
        requests, output = self.case('normal', paths)
        self.assertEqual(requests[1:], paths)
        self.assertIn(b'VODAPI:response:4', output)
        self.assertIn(b'VODAPI:response:5', output)
        self.assertNotIn(b'VODAPI:response:3', output)

    def test_invalid_cdn_range_or_encoding_cannot_certify_source(self):
        """Replaced: there is no CDN source check here; a CDN/playurl/view request can never begin."""
        self.assertEqual(self.case('public-bounds')[0], [])


if __name__ == '__main__':
    unittest.main(defaultTest='PublicReadTest')

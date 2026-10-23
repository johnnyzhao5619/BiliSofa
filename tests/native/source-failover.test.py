"""ADR-102 failover source entries: every inherited VOD/PGC read-lane check, plus the
Akamai backup family for the 512-byte source check (and only that family)."""
from pathlib import Path
import importlib.util
import unittest


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


vod, pgc = load('vod-api.test'), load('pgc-read.test')


class AkamaiCheck:
    def test_source_check_admits_only_the_akamai_backup_family(self):
        self.assertEqual(self.case('akamai')[0], [])


class VodSourceFailoverTest(AkamaiCheck, vod.VodApiTest):
    fixture = 'tests/native/vod-source-failover-fixture.c'


class PgcSourceFailoverTest(AkamaiCheck, pgc.PgcReadTest):
    fixture = 'tests/native/pgc-source-failover-fixture.c'


class OriginalSourceStaysNarrow(AkamaiCheck, pgc.PgcReadTest):
    """The frozen PGC entry still rejects the Akamai family (mode returns 0 only on rejection)."""


if __name__ == '__main__':
    unittest.main(defaultTest=['VodSourceFailoverTest', 'PgcSourceFailoverTest', 'OriginalSourceStaysNarrow'])

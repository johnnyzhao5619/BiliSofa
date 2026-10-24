"""ADR-103 catalog-up entry: every frozen catalog route check, plus the fixed UP-archives read."""
from pathlib import Path
import importlib.util
import unittest
spec = importlib.util.spec_from_file_location('catalog_tests', Path(__file__).with_name('catalog.test.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CatalogUpTest(module.CatalogTest):
    entry = 'catalog-up.c'

    def test_up_archives_fixed_get_without_credentials(self):
        self.run_case('up')

    def test_up_invalid_mid_or_page_never_enters_curl(self):
        self.run_case('up_invalid')


if __name__ == '__main__':
    unittest.main(defaultTest='CatalogUpTest')

"""ADR-106 catalog-visitor entry: every catalog, catalog-up and catalog-ua check, plus the B站 visitor identity."""
from pathlib import Path
import importlib.util
import unittest
spec = importlib.util.spec_from_file_location('catalog_ua_tests', Path(__file__).with_name('catalog-ua.test.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CatalogVisitorTest(module.CatalogUaTest):
    entry = 'catalog-visitor.c'

    def test_visitor_identity_is_the_only_cookie(self):
        self.run_case('visitor')

    def test_visitor_id_is_a_fixed_cookieless_get(self):
        self.run_case('visitor_id')

    def test_invalid_visitor_identity_never_enters_curl(self):
        self.run_case('visitor_invalid')


if __name__ == '__main__':
    unittest.main(defaultTest='CatalogVisitorTest')

"""ADR-104 catalog-ua entry: every catalog and catalog-up check, plus the TV runtime User-Agent."""
from pathlib import Path
import importlib.util
import unittest
spec = importlib.util.spec_from_file_location('catalog_up_tests', Path(__file__).with_name('catalog-up.test.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CatalogUaTest(module.CatalogUpTest):
    entry = 'catalog-ua.c'

    def test_runtime_user_agent_replaces_only_the_probe_identifier(self):
        self.run_case('ua')

    def test_invalid_runtime_user_agent_never_enters_curl(self):
        self.run_case('ua_invalid')


if __name__ == '__main__':
    unittest.main(defaultTest='CatalogUaTest')

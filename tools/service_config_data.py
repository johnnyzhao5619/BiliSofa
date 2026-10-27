"""Read the local backend profile as data for build-time policy checks only."""
import json
import re


def read_service_profile(root):
    profile = json.loads((root / 'apps/tv/service-providers/bilibili-web.json').read_text())
    def expand(value):
        return re.sub(r'\{([a-z][a-zA-Z0-9]*)(\|regex)?\}',
                      lambda m: re.sub(r'([.*+?^${}()|\[\]\\])', r'\\\1', profile['addresses'][m[1]]) if m[2] else profile['addresses'][m[1]], value)
    profile['strings'] = {key: expand(value) for key, value in profile['strings'].items()}
    profile['platformOrigins'] = [expand(value) for value in profile['platformOrigins']]
    return profile


def service_config_strings(root):
    return '\n'.join(read_service_profile(root)['strings'].values()).encode()

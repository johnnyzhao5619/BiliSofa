"""Assemble unsigned release assets from committed service-config sources; no publication."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    if subprocess.run(['git', 'diff', '--quiet', 'HEAD'], cwd=ROOT).returncode:
        raise SystemExit('Commit tracked release inputs before assembling public assets')
    source = ROOT / 'dist/BiliSofa-0.66.0-unsigned.wgt'
    payload = source.read_bytes()
    with zipfile.ZipFile(source) as archive:
        build = json.loads(archive.read('build.json'))
        names = archive.namelist()
        if build['version'] != '0.66.0' or build['identity'] != 'BiliSofa01.TV' or len(names) != len(set(names)):
            raise SystemExit('Candidate identity / duplicate entry mismatch')
        if {'author-signature.xml', 'signature1.xml'} & set(names):
            raise SystemExit('Expected an unsigned candidate')
        if set(names) != set(build['files']) | {'build.json'}:
            raise SystemExit('Unexpected candidate entries')
        for name, expected in build['files'].items():
            data = archive.read(name)
            if sha(data) != expected:
                raise SystemExit('Candidate manifest mismatch')
            if name.endswith(('.js', '.wasm')):
                inspected = data.replace(b'\\', b'') if name.endswith('.js') else data
                if re.search(rb'(?:bilibili|hdslb|bilivideo|akamaized)\.', inspected):
                    raise SystemExit('Business-domain literal remains in executable file: ' + name)
            if name.endswith('/probe.js') and any(marker not in data for marker in [b'_service_config_apply', b'_service_config_count', b'_service_config_key_word']):
                raise SystemExit('Native configuration exports missing')
        configuration = build.get('serviceConfiguration')
        if not configuration or configuration.get('requiresUserSelection') is not True:
            raise SystemExit('User-selected configuration metadata missing')
    files = {source.name: payload}
    documents = {
        'README.md': 'docs/releases/0.66.0-service-configuration.md',
        'QUICK-INSTALL.md': 'docs/QUICK_INSTALL.md',
        'QUICK-INSTALL.en.md': 'docs/QUICK_INSTALL.en.md',
        'SECURITY.md': 'SECURITY.md',
        'ADR-119.md': 'docs/adr/119-user-selected-local-service-configuration.md',
        'LICENSE': 'LICENSE', 'THIRD_PARTY_NOTICES.md': 'THIRD_PARTY_NOTICES.md',
        'RIGHTS.md': 'RIGHTS.md', 'PRIVACY.md': 'PRIVACY.md',
    }
    for target, name in documents.items():
        # Standalone candidate docs link omitted context back to the repository.
        text = (ROOT / name).read_text()
        def link(match):
            value = match[1]
            if re.match(r'^[a-z]+:', value) or value.startswith('#'):
                return match[0]
            file, mark, anchor = value.partition('#')
            path = ((ROOT / name).parent / file).resolve()
            if not path.is_relative_to(ROOT):
                raise SystemExit('Candidate document leaves repository')
            relative = path.relative_to(ROOT).as_posix()
            included = next((target for target, source in documents.items() if source == relative), None)
            destination = included or 'https://github.com/johnnyzhao5619/BiliSofa/blob/' + commit + '/' + relative
            return '](' + destination + ('#' + anchor if mark else '') + ')'
        files[target] = re.sub(r'\]\(([^)\s]+)\)', link, text).encode()
    files['BiliSofa-0.66.0-source.zip'] = subprocess.check_output([
        'git', 'archive', '--format=zip', '--prefix=BiliSofa-0.66.0/', commit,
    ], cwd=ROOT)
    manifest = {
        'schema': 1, 'version': '0.66.0', 'sourceCommit': commit,
        'sourceIdentity': 'committed sources; UI and native input digests in WGT build.json',
        'releaseUrl': 'https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0',
        'releaseChannel': 'preview',
        'applicationId': 'BiliSofa01.TV', 'serviceConfiguration': configuration,
        'wgtSha256': sha(payload), 'wgtBytes': len(payload),
        'runtimeBusinessDomainLiteralScan': 'passed for packaged JS and WASM',
        'nativeConfigurationExports': 'passed', 'applicationTests': 'not run',
        'signed': False, 'deployed': False, 'deviceAcceptance': 'not performed',
        'replaces0651FrozenArtifact': False,
        'files': {name: sha(data) for name, data in sorted(files.items())},
    }
    files['release-manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    checksums = ''.join(sha(data) + '  ' + name + '\n' for name, data in sorted(files.items())).encode()
    files['SHA256SUMS.txt'] = checksums
    output = ROOT / 'dist/releases/0.66.0'
    output.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (output / name).write_bytes(data)
    package = output / 'BiliSofa-0.66.0-download.zip'
    with zipfile.ZipFile(package, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, (2026, 10, 26, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data)
    with zipfile.ZipFile(package) as archive:
        if archive.testzip() is not None or any(archive.read(name) != data for name, data in files.items()):
            raise SystemExit('Candidate ZIP round-trip mismatch')
    (output / 'SHA256SUMS.txt').write_bytes(checksums + (sha(package.read_bytes()) + '  ' + package.name + '\n').encode())
    print(source.name, sha(payload))
    print(package.name, sha(package.read_bytes()))
    print('Release assets assembled; no application tests, signing, TV deployment or publication')


if __name__ == '__main__':
    main()

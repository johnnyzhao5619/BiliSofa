"""Assemble local 0.65.1 download files from an already verified exact-baseline build.

Does not build native modules, sign, connect a TV, publish, or change Git state.
The caller must run the baseline build and package gates in --build-root first.
"""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import io
import json
import platform
import re
import subprocess
import urllib.parse
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'e7bc3740e0fed2f9b2c89f9a83755398fa11faf7'
VERSION = '0.65.1'
WGT_NAME = 'BiliSofa-0.65.1-unsigned.wgt'
EXPECTED_WGT = 'dd778893ca4e26c2ca462cf757dc31fd7db00b56b02b2f4693c595bfa6a5b783'
PUBLIC_BASE = 'https://github.com/johnnyzhao5619/BiliSofa/blob/' + COMMIT + '/'
DOCS = [
    'README.md', 'README.en.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
    'RIGHTS.md', 'PRIVACY.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md',
    'docs/INSTALLATION.md', 'docs/QUICK_INSTALL.md', 'docs/QUICK_INSTALL.en.md', 'docs/LICENSING.md',
    'docs/BILIBILI_TERMS_RISK.md', 'docs/OPEN_SOURCE.md',
    'docs/RELEASE_CHECKLIST.md', 'docs/RELEASE_DRAFT.md', 'docs/releases/0.65.1.md',
    'docs/adr/118-public-open-source-0651-baseline.md',
    'docs/research/open-source-release-2026-10-26.md',
    'docs/research/user-supplied-site-risk-2026-10-26.md',
    'docs/archive/2026-10-26-open-source/README.md',
    'docs/archive/2026-10-26-open-source/THIRD_PARTY_NOTICES.md',
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def zip_bytes(files):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            path = PurePosixPath(name)
            if path.is_absolute() or '..' in path.parts:
                raise SystemExit('Unsafe download archive path')
            entry = zipfile.ZipInfo(name, (2026, 10, 26, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data)
    data = stream.getvalue()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if len(archive.namelist()) != len(files) or archive.testzip() is not None:
            raise SystemExit('Download ZIP integrity mismatch')
        if any(archive.read(name) != payload for name, payload in files.items()):
            raise SystemExit('Download ZIP content mismatch')
    return data


def document_payloads():
    docs_commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    files = {name: (ROOT / name).read_bytes() for name in DOCS}
    for name, payload in files.items():
        if subprocess.check_output(['git', 'show', docs_commit + ':' + name], cwd=ROOT) != payload:
            raise SystemExit('Document is not committed: ' + name)
    originals = {name: sha(data) for name, data in files.items()}
    # The companion contains selected docs. Links to omitted repository material
    # point to the exact software baseline rather than to nonexistent local files.
    for name in DOCS:
        if not name.endswith('.md') or name.startswith('docs/archive/'):
            continue
        def rewrite(match):
            target = match.group(1)
            if re.match(r'^[a-z]+:', target) or target.startswith('#'):
                return match.group(0)
            file, mark, anchor = target.partition('#')
            absolute = (ROOT / name).parent / urllib.parse.unquote(file)
            resolved = absolute.resolve()
            if not resolved.is_relative_to(ROOT):
                raise SystemExit('Document link leaves repository')
            relative = resolved.relative_to(ROOT).as_posix()
            if relative in files:
                return match.group(0)
            subprocess.run(['git', 'cat-file', '-e', docs_commit + ':' + relative], cwd=ROOT, check=True)
            url = 'https://github.com/johnnyzhao5619/BiliSofa/blob/' + docs_commit + '/' + urllib.parse.quote(relative, safe='/')
            return '](' + url + ('#' + anchor if mark else '') + ')'
        files[name] = re.sub(r'\]\(([^)\s]+)\)', rewrite, files[name].decode()).encode()
    return files, originals


def validate_wgt(payload):
    if sha(payload) != EXPECTED_WGT:
        raise SystemExit('Rebuilt WGT differs from the fixed 0.65.1 artifact')
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or archive.testzip() is not None:
            raise SystemExit('Invalid WGT archive')
        if {'author-signature.xml', 'signature1.xml'} & set(names):
            raise SystemExit('Public download must be unsigned')
        build = json.loads(archive.read('build.json'))
        if (build['identity'], build['version']) != ('BiliSofa01.TV', VERSION):
            raise SystemExit('WGT build identity mismatch')
        if set(names) != set(build['files']) | {'build.json'}:
            raise SystemExit('Unexpected WGT entries')
        for name, expected in build['files'].items():
            data = archive.read(name)
            if sha(data) != expected:
                raise SystemExit('WGT manifest mismatch')
            if PurePosixPath(name).is_absolute() or '..' in PurePosixPath(name).parts:
                raise SystemExit('Unsafe WGT path')
            if re.search(rb'-----BEGIN [A-Z ]*PRIVATE KEY-----', data):
                raise SystemExit('Private key marker found; output suppressed')
            if any(marker in data for marker in [b'/Users/', b'SESSDATA=', b'bili_jct=']):
                raise SystemExit('Private-data marker found; output suppressed')
            if Path(name).suffix.lower() in {'.p12', '.pfx', '.key'}:
                raise SystemExit('Signing-material extension found')
        xml = ET.fromstring(archive.read('config.xml'))
        app = xml.find('{http://tizen.org/ns/widgets}application')
        if xml.get('version') != VERSION or app.get('id') != 'BiliSofa01.TV':
            raise SystemExit('WGT config identity mismatch')
        for required in ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'search-NOTICE',
                         'third-party-licenses/OpenSSL-3-LICENSE.txt',
                         'third-party-licenses/curl-COPYING.txt',
                         'third-party-licenses/qrcode-generator-MIT.txt']:
            if required not in names:
                raise SystemExit('Required license missing')
    return len(names)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build-root', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/releases/0.65.1')
    args = parser.parse_args()
    stage = args.build_root.resolve()
    for name in ['tools/build-foundation-app.mjs', 'tools/package-foundation-app.py',
                 'tools/candidate_native.py', 'apps/tv/foundation-config.xml',
                 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'package.json', 'package-lock.json']:
        exact = subprocess.check_output(['git', 'show', COMMIT + ':' + name], cwd=ROOT)
        if (stage / name).read_bytes() != exact:
            raise SystemExit('Build stage is not the exact software baseline: ' + name)
    payload = (stage / 'dist' / WGT_NAME).read_bytes()
    entries = validate_wgt(payload)
    docs, original_docs = document_payloads()
    docs_name = 'BiliSofa-0.65.1-docs.zip'
    source_name = 'BiliSofa-0.65.1-source.zip'
    source = subprocess.check_output([
        'git', 'archive', '--format=zip', '--prefix=BiliSofa-0.65.1/', COMMIT,
    ], cwd=ROOT)
    files = {WGT_NAME: payload, docs_name: zip_bytes(docs), source_name: source}
    manifest = {
        'schema': 1, 'version': VERSION, 'softwareCommit': COMMIT,
        'applicationId': 'BiliSofa01.TV', 'packageId': 'BiliSofa01',
        'docsCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'docsIdentity': 'committed-companion-files',
        'originalDocSha256': original_docs,
        'companionDocSha256': {n: sha(d) for n, d in sorted(docs.items())},
        'docLinkTreatment': 'Omitted repository targets linked to exact companion documentation commit; archive docs preserved verbatim',
        'assemblyToolSha256': sha(Path(__file__).read_bytes()),
        'build': {
            'method': 'Web rebuilt from exact git archive; existing pinned native artifacts reused and checked by baseline packaging gate',
            'matchesFrozenWgt': True, 'freshNativeRecompile': False,
            'cleanMachineReproduction': False, 'wgtEntryCount': entries,
            'node': subprocess.check_output(['node', '--version'], text=True).strip(),
            'python': platform.python_version(),
        },
        'checks': {
            'baselinePackagingGate': 'passed before assembly',
            'wgtManifestAndIdentity': 'passed',
            'zipRoundTrip': 'passed',
            'privateDataScan': 'limited markers and extensions only; not a complete audit',
            'applicationTests': 'not run', 'newDeviceAcceptance': 'not performed',
            'gitHistorySensitiveDataReview': 'gitleaks redacted scan plus fixture and image review; see publication record; not a security audit',
            'thirdPartyInstallerAcceptance': 'not performed',
            'fullRightsOrSecurityAudit': 'not completed',
        },
        'distribution': {
            'releaseUrl': 'https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1',
            'rightsContact':
            'https://github.com/johnnyzhao5619/BiliSofa/issues',
        },
        'artifacts': {n: {'sha256': sha(d), 'bytes': len(d)} for n, d in sorted(files.items())},
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    files['release-manifest.json'] = manifest_bytes
    start = '''# BiliSofa 0.65.1 — 从这里开始

作者免费提供用于学习 / 测试，当前无盈利行为。内容来自 Bilibili 及其分发链路；不提供节目离线下载，在线播放有必要缓冲 / 缓存与本地适配，不能据此保证无侵权。详见 documentation/RIGHTS.md。

1. 先核对 SHA256SUMS.txt 中 WGT 的摘要，再读 [快捷安装](documentation/docs/QUICK_INSTALL.md)。
2. 可选择 Apps2Samsung 稳定版的自定义 WGT 功能：开启电视 Developer Mode → 选择电视 → 选择随包 unsigned.wgt → 由自己的 Samsung 账号 / 证书完成签名安装。此路径依据上游文档，BiliSofa 尚未独立实测。
3. 或按 [Samsung 官方工具完整指南](documentation/docs/INSTALLATION.md)手动签名安装。WGT 不是免签文件；没有修改电视 / root / 破解要求。
4. 不要把 Cookie、DUID、私钥或密码发给维护者。升级保留原 Author，不因证书不匹配默认卸载清数据。

软件基线：e7bc3740e0fed2f9b2c89f9a83755398fa11faf7；Tizen 最低声明 9.0。原生模块复用并经来源门禁，Web 层本轮重建；不是干净机器全原生重编译。无本轮设备验收。

公开下载入口：https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1 。本版本没有首次填写网站步骤。权利联系使用 https://github.com/johnnyzhao5619/BiliSofa/issues ，作者愿及时核查并随时下架相关发行文件 / 停止相关分发或功能。学习 / 测试、非营利及愿下架都不是平台授权。

English: Read documentation/README.en.md. Use the unsigned WGT with your own Samsung TV signing profile. A custom-WGT GUI route and official CLI instructions are provided; no universal unsigned installation or new device acceptance is claimed.
'''.encode()
    inside = {WGT_NAME: payload, 'START-HERE.md': start,
              'release-manifest.json': manifest_bytes, 'LICENSE': docs['LICENSE']}
    inside.update({'documentation/' + n: d for n, d in docs.items()})
    inside['SHA256SUMS.txt'] = ''.join(sha(d) + '  ' + n + '\n' for n, d in sorted(inside.items())).encode()
    files['START-HERE.md'] = start.replace(b'documentation/', b'')
    files['BiliSofa-0.65.1-download.zip'] = zip_bytes(inside)
    files['SHA256SUMS.txt'] = ''.join(sha(d) + '  ' + n + '\n' for n, d in sorted(files.items())).encode()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        target = output / name
        if target.exists() and target.read_bytes() != data:
            raise SystemExit('Refusing to overwrite differing artifact: ' + name)
        target.write_bytes(data)
    for name, data in sorted(files.items()):
        print(name, len(data), sha(data))
    print('Local artifacts only; no signing, TV actions, application tests or publication')


if __name__ == '__main__':
    main()

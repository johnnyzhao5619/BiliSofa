# Search word data (Apache-2.0)

Pinned upstream: Android Open Source Project PinyinIME, commit
`49aebad1c1cfbbcaa9288ffed5161e79e57c3679` (resolved from main/master on 2026-10-14).

- Original dictionary: https://android.googlesource.com/platform/packages/inputmethods/PinyinIME/+/49aebad1c1cfbbcaa9288ffed5161e79e57c3679/jni/data/rawdict_utf16_65105_freq.txt
- Original notice/license: https://android.googlesource.com/platform/packages/inputmethods/PinyinIME/+/49aebad1c1cfbbcaa9288ffed5161e79e57c3679/NOTICE
- Dictionary SHA-256: `408700f28a56091fa07f3b849a0f134fbfc71e6b2ae9b3f52973a5b076f599ff` (3,570,346 bytes, 65,105 rows, unchanged UTF-16 upstream file).
- AOSP-NOTICE SHA-256: `b5830d96fb5a7e7e7ebcc295f352846b4b998e78fdc8f9aa68e134d2e4b39986` (unchanged upstream copyright and Apache-2.0 license).

Original project MIT does not relicense this data. No upstream IME application/engine code is copied.
`tools/initials-data.py` validates both hashes, decodes UTF-16, orders by descending
frequency with deterministic tie breaks, derives first-letter keys, removes duplicate
word/key pairs, and emits 64,816 `[word, initials]` pairs. The generated 1,052,146-byte
JSON has SHA-256 `c723c86e502613bdaf3c613b5638ece0fe38772d92165b48f2d3ca140ba3256b`.
Both WGT variants include the derived data and the original AOSP-NOTICE, verified
before signing. Only local word suggestions are provided: this is not a Bilibili
hot-search/content catalog, a language model, or a comment/danmaku editor.

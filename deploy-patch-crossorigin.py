"""
Post-build patch: add crossorigin="anonymous" to every <script src="...">
tag across all exported dist/*.html files.

Why: without this (and a matching Access-Control-Allow-Origin response
header, added at the nginx level), some WebKit contexts - notably PWA
standalone mode specifically, more strictly than a regular Safari tab -
can treat script errors as "cross-origin" even for genuinely same-origin
scripts, and mask the real error/stack down to the generic, undebuggable
"Script error." string. This is what the +html.tsx fatal-error banner was
showing with no way to see the actual cause.

Run after every `npm run build:web`, alongside deploy-patch-manifest.py.
"""
import glob
import re

SCRIPT_SRC_RE = re.compile(r'<script(?![^>]*crossorigin)([^>]*\bsrc="[^"]+"[^>]*)>')

patched_count = 0
for path in glob.glob('dist/**/*.html', recursive=True):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    new_html, n = SCRIPT_SRC_RE.subn(r'<script\1 crossorigin="anonymous">', html)
    if n > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        patched_count += n

print(f"Patched {patched_count} <script src> tag(s) with crossorigin=\"anonymous\".")

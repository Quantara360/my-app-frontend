import glob
import re

# Expo's web export only emits the legacy Apple-specific PWA meta tag, which
# Chrome now flags as deprecated in favor of the standard one. Cosmetic only
# (no functional difference today) - this adds the modern tag alongside the
# old one rather than replacing it, since some browsers/PWA install flows
# still only recognize the Apple-specific one.
APPLE_META_RE = re.compile(r'(<meta name="apple-mobile-web-app-capable" content="yes"/?>)')
STANDARD_META = '<meta name="mobile-web-app-capable" content="yes"/>'

patched_count = 0
for path in glob.glob('dist/**/*.html', recursive=True):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    if STANDARD_META in html:
        continue
    new_html, n = APPLE_META_RE.subn(r'\1' + STANDARD_META, html)
    if n > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        patched_count += n

print(f"Added the standard mobile-web-app-capable meta tag to {patched_count} file(s).")

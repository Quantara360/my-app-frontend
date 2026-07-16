with open('dist/index.html', 'r') as f:
    html = f.read()
if 'rel="manifest"' not in html:
    html = html.replace('</head>', '<link rel="manifest" href="/manifest.json"/><meta name="theme-color" content="#000000"/><link rel="apple-touch-icon" href="/logo192.png"/><meta name="apple-mobile-web-app-capable" content="yes"/></head>')
    with open('dist/index.html', 'w') as f:
        f.write(html)
    print("PATCHED!")
else:
    print("Already has manifest link")

"""
Automatically patches all HTML templates in the templates/ folder:
1. Adds {% load static %} at the top
2. Fixes CSS/JS/image asset paths to use {% static 'filename' %}
3. Fixes internal navigation links (dashboard.html -> /dashboard, etc.)
"""
import os
import re

TEMPLATES_DIR = r"c:\Users\dell\Desktop\Nextun\templates"

# Map old .html hrefs to new Django URL paths
NAV_LINK_MAP = {
    'href="dashboard.html"': 'href="/dashboard"',
    'href="strategies.html"': 'href="/strategies"',
    'href="trades.html"': 'href="/trades"',
    'href="pricing.html"': 'href="/pricing"',
    'href="settings.html"': 'href="/settings"',
    'href="signup.html"': 'href="/signup"',
    "href='dashboard.html'": "href='/dashboard'",
    "href='strategies.html'": "href='/strategies'",
    "href='trades.html'": "href='/trades'",
    "href='pricing.html'": "href='/pricing'",
    "href='settings.html'": "href='/settings'",
    "href='signup.html'": "href='/signup'",
    # JS window.location
    "window.location.href='strategies.html'": "window.location.href='/strategies'",
    "window.location.href='dashboard.html'": "window.location.href='/dashboard'",
    "window.location.href='trades.html'": "window.location.href='/trades'",
    "window.location.href='pricing.html'": "window.location.href='/pricing'",
    "window.location.href='settings.html'": "window.location.href='/settings'",
    "window.location.href='signup.html'": "window.location.href='/signup'",
    'window.location.href="strategies.html"': 'window.location.href="/strategies"',
    'window.location.href="dashboard.html"': 'window.location.href="/dashboard"',
    'window.location.href="trades.html"': 'window.location.href="/trades"',
    'window.location.href="pricing.html"': 'window.location.href="/pricing"',
    'window.location.href="settings.html"': 'window.location.href="/settings"',
    'window.location.href="signup.html"': 'window.location.href="/signup"',
}

# Static asset extensions to wrap with {% static %}
STATIC_EXTENSIONS = ('.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.webp')

def fix_static_assets(content):
    """Replace raw asset refs with Django {% static %} tags."""
    # Match src="filename.ext" or href="filename.ext" (relative, no http/data/{% already)
    def replace_src(m):
        attr = m.group(1)  # src or href
        quote = m.group(2)  # " or '
        path = m.group(3)
        # Skip already-template, absolute URLs, data URIs, anchors, empty
        if path.startswith(('http', '{{', '{%', '#', '/', 'data:')):
            return m.group(0)
        if any(path.endswith(ext) for ext in STATIC_EXTENSIONS):
            return f"{attr}={quote}{{% static '{path}' %}}{quote}"
        return m.group(0)

    content = re.sub(r'(src|href)=(["\'])([^"\']+)\2', replace_src, content)
    return content

def fix_nav_links(content):
    for old, new in NAV_LINK_MAP.items():
        content = content.replace(old, new)
    return content

def add_load_static(content):
    if '{% load static %}' not in content:
        content = content.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n{% load static %}', 1)
    return content

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = add_load_static(content)
    content = fix_nav_links(content)
    content = fix_static_assets(content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] Patched: {os.path.basename(filepath)}")

for fname in os.listdir(TEMPLATES_DIR):
    if fname.endswith('.html'):
        process_file(os.path.join(TEMPLATES_DIR, fname))

print("\nAll templates patched successfully!")

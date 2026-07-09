"""
Patch all JS static files to update:
1. API calls from http://localhost:5000 to /api (same-origin Django)
2. Navigation redirects from page.html to /page
"""
import os
import re

STATIC_DIR = r"c:\Users\dell\Desktop\Nextun\static"

NAV_MAP = {
    "window.location.href = 'index.html'": "window.location.href = '/'",
    'window.location.href = "index.html"': 'window.location.href = "/"',
    "window.location.href = 'dashboard.html'": "window.location.href = '/dashboard'",
    'window.location.href = "dashboard.html"': 'window.location.href = "/dashboard"',
    "window.location.href = 'strategies.html'": "window.location.href = '/strategies'",
    'window.location.href = "strategies.html"': 'window.location.href = "/strategies"',
    "window.location.href = 'trades.html'": "window.location.href = '/trades'",
    'window.location.href = "trades.html"': 'window.location.href = "/trades"',
    "window.location.href = 'pricing.html'": "window.location.href = '/pricing'",
    'window.location.href = "pricing.html"': 'window.location.href = "/pricing"',
    "window.location.href = 'settings.html'": "window.location.href = '/settings'",
    'window.location.href = "settings.html"': 'window.location.href = "/settings"',
    "window.location.href = 'signup.html'": "window.location.href = '/signup'",
    'window.location.href = "signup.html"': 'window.location.href = "/signup"',
}

def patch_js(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace all localhost:5000 API calls to relative /api paths
    content = content.replace("http://localhost:5000/api", "/api")
    content = content.replace("http://localhost:5000", "")

    # Fix navigation
    for old, new in NAV_MAP.items():
        content = content.replace(old, new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] Patched: {os.path.basename(filepath)}")

for fname in os.listdir(STATIC_DIR):
    if fname.endswith('.js'):
        patch_js(os.path.join(STATIC_DIR, fname))

print("\nAll JS files patched successfully!")

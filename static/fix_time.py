import os
import re

files = [
    'dashboard.js',
    'strategies.js',
    'trades.js',
    'pricing.js',
    'settings.js'
]

dynamic_time_block = """  // Set Current Date and Time (Dynamic)
  function updateDateTime() {
    const datetimeSpan = document.getElementById('current-datetime');
    if (datetimeSpan) {
      const now = new Date();
      const options = { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: false 
      };
      datetimeSpan.textContent = now.toLocaleString('en-GB', options).replace(',', '');
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);"""

for fname in files:
    filepath = os.path.join(r"c:\Users\DELL\Desktop\Nextun\frontend", fname)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # First remove the broken block injected by the previous run
    content = re.sub(r'\s*// Set Current Date and Time \(Dynamic\).*?setInterval\(updateDateTime, 60000\);;', '', content, flags=re.DOTALL)
    
    # Also clean up any lingering fragments
    content = re.sub(r'^\s*datetimeSpan\.textContent.*?;\n\s*\}', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*datetimeElement\.textContent.*?;\n\s*\}', '', content, flags=re.MULTILINE)
    
    # And remove the original static block if it's still there
    content = re.sub(r'\s*//\s*Set[^\n]*\n\s*const\s+(datetimeSpan|datetimeElement)\s*=\s*document\.getElementById\(\'current-datetime\'\);\n\s*if\s*\([^)]+\)\s*\{[^\}]+\}', '', content, flags=re.IGNORECASE)
    
    # Now inject the new block right at the top of the DOMContentLoaded block
    content = re.sub(r'(document\.addEventListener\(\'DOMContentLoaded\',\s*\(\)\s*=>\s*\{)', r'\1\n' + dynamic_time_block, content, count=1)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

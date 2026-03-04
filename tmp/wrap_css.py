import re
import os

input_path = r'c:\Users\Israel\Desktop\delivery_app\frontend\app\admin\customers\[id]\customer-card.module.css'
output_path = r'c:\Users\Israel\Desktop\delivery_app\frontend\app\admin\customers\[id]\customer-card.css'

with open(input_path, 'r', encoding='utf-8') as f:
    text = f.read()

# We want to prepend .customer-card-app to all selectors except :root and @media lines.
new_lines = []
inside_media = False
for line in text.split('\n'):
    if line.startswith('@media'):
        inside_media = True
        new_lines.append(line)
        continue
    if inside_media and line.strip() == '}':
        inside_media = False
        new_lines.append(line)
        continue
    
    # If it's a CSS selector line (ends with { and not indented, usually)
    stripped = line.strip()
    if stripped.endswith('{') and not stripped.startswith(':root') and not stripped.startswith('@') and not stripped.startswith('/*'):
        # Split by comma for multiple selectors
        selectors = stripped[:-1].split(',')
        new_selectors = []
        for sel in selectors:
            sel = sel.strip()
            if sel:
                new_selectors.append('.customer-card-app ' + sel)
        new_lines.append(', '.join(new_selectors) + ' {')
    else:
        new_lines.append(line)

# Also make the root .customer-card-app block
root_css = """
:root {
    --bg: #0f1117;
    --surface: #181b24;
    --surface2: #1e2232;
    --surface3: #252a3a;
    --border: #2a2f45;
    --accent: #4f6ef7;
    --accent2: #7c3aed;
    --green: #10b981;
    --amber: #f59e0b;
    --red: #ef4444;
    --text: #e8eaf0;
    --muted: #7b83a6;
    --soft: #b0b8d4;
}

.customer-card-app {
    font-family: 'Heebo', sans-serif;
    background: var(--bg);
    color: var(--text);
    height: 100%;
    min-height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
}
"""

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(root_css + "\n" + '\n'.join(new_lines))

if os.path.exists(input_path):
    os.remove(input_path)

print("Safely pre-fixed CSS saved!")

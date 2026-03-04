import re
import os

input_path = r'c:\Users\Israel\Desktop\delivery_app\frontend\app\admin\customers\[id]\customer-card.css'
output_path = r'c:\Users\Israel\Desktop\delivery_app\frontend\app\admin\customers\[id]\customer-card.module.css'

with open(input_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the prefix from all descendants (e.g. `.customer-card-app .main` -> `.main`)
content = content.replace('.customer-card-app ', '')

# Fix layout rules
content = content.replace('height: calc(100vh - 64px);', 'height: 100%; min-height: calc(100vh - 64px);')

grid_original = '''display: grid;
    grid-template-columns: 300px 1fr 280px;
    overflow: hidden;
    height: 100%;'''

grid_new = '''display: grid;
    grid-template-columns: minmax(260px, 300px) 1fr minmax(250px, 280px);
    overflow: hidden;
    height: 100%;'''

content = content.replace('grid-template-columns: 300px 1fr 280px;', 'grid-template-columns: minmax(260px, 300px) 1fr minmax(250px, 280px);')

# Add responsive break points at the end
responsive_css = '''
/* ===== RESPONSIVE ===== */
@media (max-width: 1200px) {
    .main {
        grid-template-columns: 250px 1fr 250px;
    }
}

@media (max-width: 992px) {
    .main {
        grid-template-columns: 1fr;
        overflow-y: auto;
    }
    .panel-left, .panel-center, .panel-right {
        border-right: none;
        border-left: none;
        border-bottom: 1px solid var(--border);
        overflow-y: visible;
    }
}
'''
if "/* ===== RESPONSIVE ===== */" not in content:
    content += responsive_css

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

os.remove(input_path)
print("CSS transformed successfully!")

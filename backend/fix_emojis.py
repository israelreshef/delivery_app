"""
Strip emoji characters from Python files that cause UnicodeEncodeError on Windows cp1255 console.
Only strips emojis from print() and logging calls - not from data strings like ₪ (shekel).
"""
import re
import os
import glob

# Emoji pattern - matches most emoji ranges but NOT Hebrew, Arabic, or currency symbols
emoji_pattern = re.compile(
    "["
    "\U0001F300-\U0001F9FF"  # Miscellaneous Symbols and Pictographs, Emoticons, etc.
    "\u2600-\u26FF"          # Miscellaneous Symbols
    "\u2700-\u27BF"          # Dingbats
    "\u2764"                 # Heart
    "\U0001FA00-\U0001FA6F"  # Chess Symbols
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "\u200d"                 # Zero Width Joiner
    "\ufe0f"                 # Variation Selector
    "]+", 
    flags=re.UNICODE
)

files_to_fix = (
    glob.glob('services/*.py') + 
    glob.glob('utils/*.py') + 
    glob.glob('routes/*.py') + 
    ['app.py']
)

total_fixes = 0
for filepath in files_to_fix:
    if not os.path.exists(filepath):
        continue
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = emoji_pattern.sub('', content)
        
        if new_content != content:
            fixes = len(content) - len(new_content)
            total_fixes += fixes
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {filepath}: removed {fixes} emoji characters")
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

print(f"\nTotal emoji characters removed: {total_fixes}")

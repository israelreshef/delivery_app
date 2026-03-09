import os

path = r'c:\Users\Israel\Desktop\delivery_app\frontend\app\admin\customers\page.tsx'
with open(path, 'rb') as f:
    content = f.read()

# Try to find exactly which encoding it is
encodings_to_try = ['utf-8', 'windows-1255', 'windows-1252', 'utf-16']
text = None
used_enc = None

for enc in encodings_to_try:
    try:
        text = content.decode(enc)
        used_enc = enc
        print(f"Successfully decoded with {enc}")
        break  # utf-8 might succeed if it is actually utf-8, but next.js complained, so it might not be utf-8
    except UnicodeDecodeError:
        pass

if not text:
    # Fallback with ignore
    text = content.decode('utf-8', 'ignore')
    used_enc = 'utf-8-ignore'
    print("Fallback to utf-8 ignore")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"File saved successfully as UTF-8. Was previously decoded using {used_enc}.")

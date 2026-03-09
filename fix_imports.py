import os

directory = r"c:\Users\Israel\Desktop\delivery_app\mobile-native\androidApp\src\main\java\com\tzir\delivery\android\ui"
theme_import = "import com.tzir.delivery.android.ui.theme.*\n"

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".kt"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            has_theme = any(line.strip() == theme_import.strip() for line in lines)
            
            if not has_theme:
                # Find the last import
                last_import_idx = -1
                for i, line in enumerate(lines):
                    if line.startswith("import "):
                        last_import_idx = i
                
                if last_import_idx != -1:
                    lines.insert(last_import_idx + 1, theme_import)
                    with open(path, "w", encoding="utf-8") as f:
                        f.writelines(lines)
                    print(f"Added theme import to {file}")

print("Done.")

import os

directory = r"c:\Users\Israel\Desktop\delivery_app\mobile-native\androidApp\src\main\java\com\tzir\delivery\android\ui\courier"

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".kt"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            if "OfficialCard(" in content:
                new_content = content.replace("OfficialCard(", "GlassCard(")
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Fixed OfficialCard in {file}")

print("Done.")

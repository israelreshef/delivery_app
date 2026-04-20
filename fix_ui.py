import re

path = 'c:/Users/Israel/Desktop/delivery_app/mobile-native/courier-android/src/main/java/com/tzir/delivery/courier/ui/components/PremiumComponents.kt'

with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Replace the text
new_text = re.sub(
    r'text = "[^"]*\$\{mission\.estimatedPrice\}"',
    r'val displayPrice = mission.price ?: mission.estimatedPrice\n                    Text(\n                        text = "₪ $displayPrice"',
    text
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Replaced successfully!")

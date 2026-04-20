import os

file_path = 'backend/models.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_line = "delivery_status_enum = db.Enum('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed', name='delivery_status_type', metadata=db.metadata)"
new_line = "delivery_status_enum = db.Enum('pending', 'assigned', 'picked_up', 'in_transit', 'arrived', 'delivered', 'cancelled', 'failed', name='delivery_status_type', metadata=db.metadata)"

if old_line in content:
    new_content = content.replace(old_line, new_line)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated models.py")
else:
    print("Could not find the target line in models.py")
    # Let's see what's actually there
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        if len(lines) >= 21:
            print(f"Line 21: {repr(lines[20])}")

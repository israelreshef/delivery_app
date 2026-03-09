"""
Fix script: Add ondelete='CASCADE' to FK columns in models.py
This ensures that when a User/Customer/Courier is deleted, all related rows
are automatically cleaned up by the DB engine, preventing OperationalErrors.
"""
import re

with open('models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern: db.ForeignKey('table.id') -> db.ForeignKey('table.id', ondelete='CASCADE')
# We only apply CASCADE where it makes sense (child records should die with parent)
cascade_tables = ['users.id', 'customers.id', 'couriers.id', 'deliveries.id']

fixed = 0
for table in cascade_tables:
    # Match ForeignKey('table.id') NOT already having ondelete=
    pattern = r"(db\.ForeignKey\('" + re.escape(table) + r"'\))(?!\s*,\s*ondelete)"
    replacement = r"db.ForeignKey('" + table + r"', ondelete='CASCADE')"
    new_content = re.sub(pattern, replacement, content)
    count = len(re.findall(pattern, content))
    fixed += count
    content = new_content

with open('models.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Done. Applied CASCADE to {fixed} FK columns.")

import io

filepath = 'routes/customers.py'
content = open(filepath, 'rb').read()

# Decode safely
try:
    decoded = content.decode('utf-8')
except:
    decoded = content.decode('utf-8', errors='ignore')

lines = decoded.splitlines()

# Remove the bad appended note route (it was added with corrupted encoding)
result_lines = []
skip = False
for line in lines:
    stripped = line.strip()
    if "@customers_bp.route('/<int:customer_id>/notes', methods=['POST'])" in stripped:
        skip = True
    if skip:
        if "return jsonify({'error': str(e)}), 500" in stripped:
            skip = False
        continue
    result_lines.append(line)

new_content = '\n'.join(result_lines).rstrip()

# Append correct route
new_content += """

@customers_bp.route('/<int:customer_id>/notes', methods=['POST'])
@token_required
@role_required('admin')
def add_customer_note(current_user, customer_id):
    try:
        data = request.json
        if not data or not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400

        note = CustomerNote(
            customer_id=customer_id,
            content=data['content'],
            created_by=current_user.id
        )
        db.session.add(note)
        db.session.commit()

        return jsonify({'success': True, 'id': note.id, 'message': 'Note added successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
"""

with io.open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("customers.py fixed successfully!")

# Verify Python syntax
import py_compile
try:
    py_compile.compile(filepath, doraise=True)
    print("Syntax OK!")
except py_compile.PyCompileError as e:
    print(f"Syntax error: {e}")

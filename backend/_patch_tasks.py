with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

if 'tasks_bp' in content:
    print('tasks_bp ALREADY REGISTERED')
else:
    # Find the archive_bp registration and insert tasks_bp after it
    marker = "app.register_blueprint(archive_bp, url_prefix='/api/archive')"
    insertion = "\n\n    from routes.tasks import tasks_bp\n    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')"
    if marker in content:
        content = content.replace(marker, marker + insertion, 1)
        with open('app.py', 'w', encoding='utf-8') as f:
            f.write(content)
        print('tasks_bp REGISTERED SUCCESSFULLY')
    else:
        print('FAILED - marker not found in file')
        # Print some context for debugging
        idx = content.find('archive_bp')
        if idx != -1:
            print(f"Found 'archive_bp' at index {idx}:")
            print(repr(content[idx-20:idx+100]))

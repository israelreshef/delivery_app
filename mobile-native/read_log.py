import sys

try:
    with open('compile_log.txt', 'r', encoding='utf-16') as f:
        content = f.read()
        lines = content.splitlines()
        errors = [line for line in lines if line.strip().startswith('e:')]
        with open('errors_only.txt', 'w', encoding='utf-8') as out:
            for err in errors:
                out.write(err + '\n')
    print(f"Successfully wrote {len(errors)} errors to errors_only.txt")
except Exception as e:
    print(f"Error: {e}")

import sys

try:
    with open('compile_log.txt', 'rb') as f:
        print(f.read(32).hex())
except Exception as e:
    print(f"Error: {e}")

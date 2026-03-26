#!/usr/bin/env python3
"""
Import Requirements Tasks Script
---------------------------------
Parses COURIER_APP_REQUIREMENTS.md for checklist items and calls
POST /api/tasks/import-requirements to create CustomerTask entries.

Usage:
    python scripts/import_requirements_tasks.py [--base-url http://localhost:5000] [--token JWT_TOKEN]
"""
import argparse
import requests
import sys


def main():
    parser = argparse.ArgumentParser(description='Import requirements from MD into CustomerTask')
    parser.add_argument('--base-url', default='http://localhost:5000', help='Base URL of the backend API')
    parser.add_argument('--token', required=True, help='JWT token for authentication')
    parser.add_argument('--priority', default='high', choices=['low', 'medium', 'high'], help='Default priority')
    parser.add_argument('--assigned-to', type=int, default=None, help='User ID to assign tasks to')
    parser.add_argument('--include-checked', action='store_true', help='Include already checked items')
    parser.add_argument('--requirements-path', default=None, help='Custom path to requirements file')
    args = parser.parse_args()

    url = f'{args.base_url}/api/tasks/import-requirements'
    headers = {
        'Authorization': f'Bearer {args.token}',
        'Content-Type': 'application/json'
    }
    payload = {
        'priority': args.priority,
        'include_checked': args.include_checked,
    }
    if args.assigned_to:
        payload['assigned_to'] = args.assigned_to
    if args.requirements_path:
        payload['requirements_path'] = args.requirements_path

    print(f'📋 Importing requirements from {args.base_url}...')
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        print(f'✅ Done! Created: {data.get("created", 0)}, Skipped: {data.get("skipped", 0)}, Total parsed: {data.get("total_parsed", 0)}')
        if data.get('created_source_ids'):
            print(f'   New IDs: {", ".join(data["created_source_ids"][:20])}')
    except requests.exceptions.RequestException as e:
        print(f'❌ Error: {e}')
        if hasattr(e, 'response') and e.response is not None:
            print(f'   Response: {e.response.text}')
        sys.exit(1)


if __name__ == '__main__':
    main()

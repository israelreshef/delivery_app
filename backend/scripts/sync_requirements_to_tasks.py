#!/usr/bin/env python3
"""Sync items from COURIER_APP_REQUIREMENTS.md into CustomerTask via /api/tasks.

Usage:
  API_URL=http://localhost:5000 API_TOKEN=<token> python backend/scripts/sync_requirements_to_tasks.py

This script looks for markdown checklist lines tagged with REQ-xxxx:
- [ ] [REQ-0001] Some feature

And creates tasks if not already existing.
"""

import os
import re
import requests

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REQ_PATH = os.path.join(BASE_DIR, 'COURIER_APP_REQUIREMENTS.md')
API_URL = os.environ.get('API_URL', 'http://localhost:5000')
API_TOKEN = os.environ.get('API_TOKEN')

if not API_TOKEN:
    raise SystemExit('API_TOKEN environment variable is required')

HEADERS = {
    'Authorization': f'Bearer {API_TOKEN}',
    'Content-Type': 'application/json',
}

REQ_PATTERN = re.compile(r'^\s*- \[[ xX]\]\s*\[(REQ-\d+)\]\s*(.*)$')


def extract_requirements(path):
    reqs = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            match = REQ_PATTERN.match(line)
            if match:
                req_id, title = match.groups()
                reqs.append({'source_id': req_id, 'title': title.strip()})
    return reqs


def get_existing_tasks():
    resp = requests.get(f'{API_URL}/api/tasks', headers=HEADERS)
    resp.raise_for_status()
    return resp.json()


def create_task(payload):
    resp = requests.post(f'{API_URL}/api/tasks', headers=HEADERS, json=payload)
    if resp.status_code not in (200, 201):
        print('Failed to create', payload, '->', resp.status_code, resp.text)
        return None
    return resp.json()


def main():
    print('Reading requirements from', REQ_PATH)
    reqs = extract_requirements(REQ_PATH)
    print('Found', len(reqs), 'requirements with REQ- tags')

    existing = get_existing_tasks()
    existing_source = {t.get('source_id'): t for t in existing if t.get('source') == 'requirements' and t.get('source_id')}

    for req in reqs:
        src_id = req['source_id']
        if src_id in existing_source:
            print('Skipping existing task', src_id)
            continue

        payload = {
            'title': f"[{src_id}] {req['title']}",
            'description': f"נוצר מ-COURIER_APP_REQUIREMENTS.md ({src_id})",
            'priority': 'high',
            'status': 'open',
            'source': 'requirements',
            'source_id': src_id,
        }
        print('Creating', src_id)
        result = create_task(payload)
        print(' ->', result)


if __name__ == '__main__':
    main()

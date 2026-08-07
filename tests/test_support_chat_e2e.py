"""
E2E Test: Support Ticket & Chat Flow

Tests the full flow:
1. Courier creates a support ticket with a message
2. Admin fetches tickets and sees the new ticket with ticket_number, first_message
3. Admin sends a reply message
4. Courier fetches ticket details and sees all messages (persistence)
5. Admin updates ticket status
6. Verify data persistence between both sides
"""

import requests
import random
import string
import json
import os
import time
import sys

# Handle terminal encoding for Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = os.environ.get("API_URL", "http://localhost:5000")
PASS = "[OK]"
FAIL = "[FAIL]"


def random_str(length=8):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def log(ok: bool, msg: str):
    print(f"  {PASS if ok else FAIL} {msg}")


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    END = "\033[0m"


def header(title: str):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{Colors.END}\n")


def run():
    errors = 0

    header("E2E: Support & Chat - Full Flow Test")

    # =========================================================================
    # 1. Register Courier
    # =========================================================================
    print("1. Register new courier:")
    courier_user = f"courier_{random_str()}"
    courier_email = f"{courier_user}@test.com"
    courier_pass = "Test1234!"
    courier_phone = f"050{random_str(7)}"

    try:
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": courier_user,
            "email": courier_email,
            "password": courier_pass,
            "full_name": "Test Courier",
            "phone": courier_phone,
            "user_type": "courier"
        }, timeout=10)
        ok = r.status_code == 201
        log(ok, f"Courier registered: {courier_user}" + (f" ({r.text[:100]})" if not ok else ""))
        if not ok:
            errors += 1
    except Exception as e:
        log(False, f"Server connection failed ({BASE_URL}): {e}")
        print(f"\n{Colors.RED}Server not available. Start with: cd backend && python app.py{Colors.END}")
        return 1

    # =========================================================================
    # 2. Login as Courier
    # =========================================================================
    print("\n2. Login as courier:")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": courier_email,
        "password": courier_pass
    }, timeout=10)
    ok = r.status_code == 200
    log(ok, f"Courier login" + (f" ({r.text[:100]})" if not ok else ""))
    if not ok:
        errors += 1
        return errors
    courier_token = r.json().get("token")
    courier_headers = {"Authorization": f"Bearer {courier_token}"}

    # =========================================================================
    # 3. Courier creates a support ticket with a message
    # =========================================================================
    print("\n3. Courier creates a support ticket with message:")
    msg_text = f"Hi, I have a question about delivery #{random_str(4)} - can I change the address?"
    r = requests.post(f"{BASE_URL}/api/support/tickets", json={
        "subject": "Question about delivery",
        "message": msg_text,
        "priority": "medium",
        "attachments": []
    }, headers=courier_headers, timeout=10)

    if r.status_code == 201:
        ticket_id = r.json().get("id")
        ticket_number = r.json().get("ticket_number")
        log(True, f"Ticket created: #{ticket_number} (id={ticket_id})")
    else:
        ticket_id = None
        error_detail = r.text[:200]
        log(False, f"Create ticket failed: {error_detail}")
        errors += 1

    # =========================================================================
    # 4. Courier fetches ticket details - verify message saved & ticket_number
    # =========================================================================
    print("\n4. Courier fetches ticket details (verify message saved):")
    if ticket_id:
        r = requests.get(f"{BASE_URL}/api/support/tickets/{ticket_id}",
                         headers=courier_headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            t = data.get("ticket", {})
            msgs = data.get("messages", [])
            has_ticket_number = bool(t.get("ticket_number"))
            has_message = len(msgs) > 0
            msg_saved = msgs[0].get("message") == msg_text if has_message else False
            log(has_ticket_number, f"ticket_number exists: {t.get('ticket_number')}")
            log(has_message, f"Messages found: {len(msgs)}")
            log(msg_saved, "Message content saved correctly")
            if not (has_ticket_number and has_message and msg_saved):
                errors += 1
        else:
            log(False, f"Fetch ticket details failed: {r.text[:200]}")
            errors += 1
    else:
        log(False, "Skipped - no ticket_id")
        errors += 1

    # =========================================================================
    # 5. Admin fetches tickets list
    # =========================================================================
    print("\n5. Login as admin and fetch tickets list:")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@tzir.com",
        "password": "super_admin2026!"
    }, timeout=10)
    ok = r.status_code == 200
    log(ok, "Admin login" + (f" ({r.text[:100]})" if not ok else ""))
    if ok:
        admin_token = r.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        r = requests.get(f"{BASE_URL}/api/support/tickets",
                         headers=admin_headers, timeout=10)
        if r.status_code == 200:
            tickets = r.json()
            found = any(t.get("id") == ticket_id for t in tickets)
            ticket_data = next((t for t in tickets if t.get("id") == ticket_id), None)
            has_first_msg = bool(ticket_data and ticket_data.get("first_message")) if ticket_data else False
            has_ticket_num = bool(ticket_data and ticket_data.get("ticket_number")) if ticket_data else False
            has_msg_count = (ticket_data and ticket_data.get("message_count", 0) > 0) if ticket_data else False

            log(found, f"Ticket #{ticket_number} appears in admin ticket list")
            log(has_ticket_num, "ticket_number displayed in list")
            log(has_first_msg, "first_message (preview) exists")
            log(has_msg_count, "Message count is correct")
            if not (found and has_first_msg and has_ticket_num):
                errors += 1
        else:
            log(False, f"Fetch ticket list failed: {r.text[:200]}")
            errors += 1
    else:
        admin_headers = None
        errors += 1

    # =========================================================================
    # 6. Admin replies to the ticket
    # =========================================================================
    print("\n6. Admin replies to the courier's ticket:")
    if ticket_id and admin_headers:
        admin_reply = "Hello, we received your inquiry. We will check and get back to you shortly."
        r = requests.post(f"{BASE_URL}/api/support/tickets/{ticket_id}/messages", json={
            "message": admin_reply,
            "is_internal": False
        }, headers=admin_headers, timeout=10)

        if r.status_code == 201:
            log(True, f"Admin reply sent: {admin_reply[:50]}...")
        else:
            log(False, f"Send reply failed: {r.text[:200]}")
            errors += 1

        # 6b. Courier fetches ticket - should see admin's reply
        print("\n   Courier fetches ticket (verifies admin reply visible):")
        r = requests.get(f"{BASE_URL}/api/support/tickets/{ticket_id}",
                         headers=courier_headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            msgs = data.get("messages", [])
            admin_msg_found = any(m.get("message") == admin_reply for m in msgs)
            msg_count = len(msgs)
            log(admin_msg_found, f"Admin reply visible to courier ({msg_count} total messages)")
            if not admin_msg_found:
                errors += 1
        else:
            log(False, f"Fetch ticket failed: {r.text[:200]}")
            errors += 1
    else:
        log(False, "Skipped - missing ticket_id or admin_headers")
        errors += 1

    # =========================================================================
    # 7. Persistence: re-fetch from both sides
    # =========================================================================
    print(f"\n7. Verify persistence:")
    if ticket_id:
        r1 = requests.get(f"{BASE_URL}/api/support/tickets/{ticket_id}",
                          headers=courier_headers, timeout=10)
        r2 = requests.get(f"{BASE_URL}/api/support/tickets/{ticket_id}",
                          headers=admin_headers, timeout=10)
        courier_msgs = r1.json().get("messages", []) if r1.status_code == 200 else []
        admin_msgs = r2.json().get("messages", []) if r2.status_code == 200 else []
        both_have_msgs = len(courier_msgs) > 0 and len(admin_msgs) > 0
        same_count = len(courier_msgs) == len(admin_msgs)
        log(both_have_msgs, "Both sides see messages")
        log(same_count, f"Same message count: {len(courier_msgs)}")
        if not (both_have_msgs and same_count):
            errors += 1
    else:
        log(False, "Skipped")
        errors += 1

    # =========================================================================
    # 8. Admin updates ticket status
    # =========================================================================
    print(f"\n8. Admin updates ticket status:")
    if ticket_id and admin_headers:
        r = requests.put(f"{BASE_URL}/api/support/tickets/{ticket_id}", json={
            "status": "in_progress"
        }, headers=admin_headers, timeout=10)
        ok = r.status_code == 200
        log(ok, f"Update status to in_progress" + (f" ({r.text[:100]})" if not ok else ""))
        if not ok:
            errors += 1

        # Verify status updated
        r = requests.get(f"{BASE_URL}/api/support/tickets/{ticket_id}",
                         headers=courier_headers, timeout=10)
        if r.status_code == 200:
            status = r.json().get("ticket", {}).get("status")
            log(status == "in_progress", f"Courier sees updated status: {status}")
            if status != "in_progress":
                errors += 1
        else:
            log(False, f"Fetch ticket failed")
            errors += 1
    else:
        log(False, "Skipped")
        errors += 1

    # =========================================================================
    # 9. Courier sends another message in existing ticket
    # =========================================================================
    print(f"\n9. Courier sends another message in existing ticket:")
    if ticket_id:
        follow_up = "Thanks, I'll wait for the update."
        r = requests.post(f"{BASE_URL}/api/support/tickets/{ticket_id}/messages", json={
            "message": follow_up,
            "attachments": []
        }, headers=courier_headers, timeout=10)
        if r.status_code == 201:
            log(True, f"Follow-up sent: {follow_up}")

            # Verify message count
            r = requests.get(f"{BASE_URL}/api/support/tickets",
                             headers=courier_headers, timeout=10)
            if r.status_code == 200:
                ticket_entry = next((t for t in r.json() if t["id"] == ticket_id), None)
                if ticket_entry:
                    log(ticket_entry.get("message_count", 0) >= 3,
                        f"Message count: {ticket_entry.get('message_count')}")
            else:
                log(False, "Failed to refresh ticket list")
                errors += 1
        else:
            log(False, f"Follow-up send failed: {r.text[:200]}")
            errors += 1
    else:
        log(False, "Skipped")
        errors += 1

    # =========================================================================
    # 10. Max 2 tickets enforcement
    # =========================================================================
    print(f"\n10. Max 2 tickets enforcement:")
    if courier_headers:
        r = requests.post(f"{BASE_URL}/api/support/tickets", json={
            "subject": "Second ticket",
            "message": "Another issue",
            "priority": "medium",
            "attachments": []
        }, headers=courier_headers, timeout=10)
        second_created = r.status_code == 201
        log(second_created, f"Second ticket created: {r.json().get('ticket_number', 'N/A') if second_created else 'failed'}")
        if second_created:
            r = requests.post(f"{BASE_URL}/api/support/tickets", json={
                "subject": "Third ticket",
                "message": "Should be blocked",
                "priority": "medium",
                "attachments": []
            }, headers=courier_headers, timeout=10)
            blocked = r.status_code == 400
            error_msg = r.json().get("error", "") if r.status_code == 400 else "NO_BLOCK"
            log(blocked, f"Third ticket blocked (as expected)" + (f": {error_msg}" if blocked else f" (got {r.status_code})"))
            if not blocked:
                errors += 1
        else:
            log(False, "Couldn't create second ticket to test limit")
            errors += 1
    else:
        log(False, "Skipped - no courier auth")
        errors += 1

    # =========================================================================
    # Results
    # =========================================================================
    print(f"\n{Colors.BOLD}{'='*60}")
    if errors == 0:
        print(f"  {Colors.GREEN}{PASS} ALL TESTS PASSED!{Colors.END}")
    else:
        print(f"  {Colors.RED}{FAIL} {errors} TESTS FAILED{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}\n")
    return errors


if __name__ == "__main__":
    exit(run())

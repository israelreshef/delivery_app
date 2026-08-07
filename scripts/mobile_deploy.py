"""
Helper for deploying an Android app to a specific emulator that is already
launched (or already running) on a given ADB serial.

Usage:
    python mobile_deploy.py <serial> <apk_path> <package> <activity> [--launch]

Behaviour:
    1. Wait for the device to come online (ADB) up to --online-timeout.
    2. Wait for sys.boot_completed == 1 up to --boot-timeout.
    3. Install the APK with adb install -r .
    4. If --launch, clear the app then start its launcher activity.

Exit code 0 on success, 1 on failure.
"""
import argparse
import subprocess
import sys
import time


def run(args, capture=True):
    try:
        return subprocess.run(args, capture_output=capture, text=True)
    except FileNotFoundError:
        print(f"[mobile_deploy] executable not found: {args[0]}", file=sys.stderr)
        return None


def adb(*args):
    return [ADB, *args]


def main():
    global ADB
    ap = argparse.ArgumentParser()
    ap.add_argument("serial")
    ap.add_argument("apk_path")
    ap.add_argument("package")
    ap.add_argument("activity")
    ap.add_argument("--launch", action="store_true")
    ap.add_argument("--online-timeout", type=int, default=int(os.environ.get("ONLINE_TIMEOUT", "180")))
    ap.add_argument("--boot-timeout", type=int, default=int(os.environ.get("BOOT_TIMEOUT", "180")))
    ap.add_argument("--adb", default=None)
    ap.add_argument("--label", default="app")
    args = ap.parse_args()

    ADB = args.adb or "adb"

    serial = args.serial
    print(f"[mobile_deploy:{args.label}] target serial={serial}")

    # 1. Wait for online
    deadline = time.time() + args.online_timeout
    online = False
    while time.time() < deadline:
        r = run(adb("devices"))
        if r:
            for line in r.stdout.splitlines():
                parts = line.split("\t")
                if len(parts) == 2 and parts[0].strip() == serial and parts[1].strip() == "device":
                    online = True
                    break
        if online:
            break
        time.sleep(3)
    if not online:
        print(f"[mobile_deploy:{args.label}] ERROR: device {serial} not online in time", file=sys.stderr)
        sys.exit(1)
    print(f"[mobile_deploy:{args.label}] device online")

    # 2. Wait for boot completed
    deadline = time.time() + args.boot_timeout
    while time.time() < deadline:
        r = run(adb("-s", serial, "shell", "getprop", "sys.boot_completed"))
        if r and r.stdout.strip() == "1":
            print(f"[mobile_deploy:{args.label}] boot completed")
            break
        time.sleep(4)
    else:
        print(f"[mobile_deploy:{args.label}] WARNING: boot not confirmed within timeout, continuing")

    # 3. Install
    r = run(adb("-s", serial, "install", "-r", args.apk_path))
    if r is None or r.returncode != 0:
        print(f"[mobile_deploy:{args.label}] ERROR: install failed", file=sys.stderr)
        if r:
            print(r.stdout, file=sys.stderr)
            print(r.stderr, file=sys.stderr)
        sys.exit(1)
    print(f"[mobile_deploy:{args.label}] APK installed")

    # 4. Launch
    if args.launch:
        run(adb("-s", serial, "shell", "pm", "clear", args.package))
        run(adb("-s", serial, "shell", "am", "start", "-n", f"{args.package}/{args.activity}"))
        print(f"[mobile_deploy:{args.label}] launched {args.package}/{args.activity}")

    print(f"[mobile_deploy:{args.label}] DONE")
    sys.exit(0)


if __name__ == "__main__":
    import os

    main()
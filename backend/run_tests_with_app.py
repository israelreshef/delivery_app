import subprocess
import sys


def main() -> int:
    print("Running backend pytest suite...")
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "-q"],
        cwd=".",
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())

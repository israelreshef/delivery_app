# Known Issues & Workarounds

## 1. Android App: "מכשיר לא נתמך" (Device Not Supported)

### Cause
Both Courier and Customer Android apps enforce a hardware-backed keystore check via `SecurityEnforcer.isDeviceCompatible()`. On emulators, `AndroidKeyStore` runs in software-only mode, so `KeyInfo.isInsideSecureHardware` returns `false`, blocking the app.

### Files
- `mobile-native/courier-android/src/main/java/com/tzir/delivery/courier/security/SecurityEnforcer.kt`
- `mobile-native/customer-android/src/main/java/com/tzir/delivery/customer/security/SecurityEnforcer.kt`

### Fix Applied
Added `isEmulator()` detection that returns `true` on known emulator fingerprints, models, and hardware strings. In debug/dev on an emulator, the hardware check is skipped. On physical devices (production), the strict check remains.

### Testing on Emulator
Build and install the debug APK — the `isEmulator()` check will bypass hardware verification automatically.

---

## 2. Backend: PostgreSQL Connection Refused

### Cause
The `run.bat` launcher tries to start PostgreSQL via Docker (`docker compose up -d db redis`). If Docker Desktop is not running, or the containers fail to start, the script previously still set `DATABASE_URL` to the PostgreSQL connection string, causing Flask to crash at startup.

### Error
```
psycopg2.OperationalError: connection to server at "localhost" (::1), port 5432 failed: Connection refused
```

### Fix Applied
- Verify Docker engine is running (`docker info`) before attempting container start
- Wait up to 30s for PostgreSQL to become healthy (via `docker inspect` + `pg_isready`)
- Fall back to `SQLite` (`sqlite:///delivery_app.db`) if Docker is unavailable or the database doesn't become ready

---

## 3. Frontend: localhost:3000 Not Reachable

### Cause
`run.bat` ran `npm run dev` without ensuring `node_modules` existed first. If the project had not been bootstrapped, the Next.js dev server would fail silently.

### Fix Applied
- Check if `node_modules` exists; if not, run `npm ci` (fallback to `npm install`)
- Verify `node` is available in PATH before attempting to start

---

## 4. Emulator Process Management (run.bat)

### Previous Problem
`run.bat` blindly killed ALL `qemu-system-x86_64.exe` processes at startup, which could kill user's unrelated emulators.

### Fix Applied
- Check if an emulator is already visible via ADB before launching
- Check if a `qemu-system-*.exe` process is already running before killing anything
- Only ports 5000/3000 are force-cleaned (backend/frontend)

---

## 5. Launcher Script Resilience (run.bat)

### Previous Issues
- No error checking after Docker commands
- No health check for database readiness
- No `npm install` before frontend start
- `DATABASE_URL` set even when PostgreSQL wasn't available
- Parentheses inside `if ( ... )` blocks caused batch parsing errors (e.g. `echo ... (port may be in use)...` broke the `if` block)
- Trailing space in `DATABASE_URL` value: `set DATABASE_URL=!DB_URL! && set ...` — the space before `&&` is included in the variable value by `set`, resulting in `database "delivery_db " does not exist`

### Fix Applied
- Each critical step now checks error levels and degrades gracefully
- `docker info` validates the engine is running before `docker compose`
- 30s retry loop for PostgreSQL readiness with fallback to SQLite
- Node.js availability is verified; deps installed on demand
- Emulator launch guards against duplicate instances
- Removed parentheses from `echo` strings inside `if` blocks to fix batch parser
- Removed trailing spaces before `&&` in `set` commands: `set DATABASE_URL=!DB_URL!&& set FLASK_ENV=development&& ...`

### File
- `run.bat` (project root)

---

## 6. Redis Port Conflict with Infrastructure Routing Stack

### Cause
The project has two independent Docker Compose stacks:
- Main stack (`docker-compose.yml`): Redis on port **6379**
- Routing stack (`infrastructure/routing/docker-compose.yml`): Redis on port **6379** (Valhalla/Nominatim)

If the routing stack's Redis is already running, the main stack's Redis container fails to bind port 6379.

### Fix Applied
Redis startup is now **optional**. If Redis fails to start (port conflict), the script logs a warning and continues. The backend will work without Redis; Socket.IO falls back to in-memory mode (single process).

### Files
- `docker-compose.yml` (main stack)
- `infrastructure/routing/docker-compose.yml` (routing stack)
- `run.bat` (handles the conflict gracefully)

---

## 7. Docker Container Naming Convention

### Cause
Docker Compose derives container names from the project directory name. The directory is `delivery_app` (with underscore), so containers are named `delivery_app-db-1`, `delivery_app-redis-1`, etc. The original `run.bat` referenced `delivery-app-db-1` (hyphen), which didn't match the actual container names.

### Fix Applied
- Primary health check uses `docker compose exec -T db pg_isready` (uses service name, not container name)
- Fallback uses the correct container name `delivery_app-db-1` (underscore)
- The `-T` flag (no TTY) is required for non-interactive execution

### Relevant run.bat lines
- `docker compose exec -T db pg_isready -U delivery_user` (service-based check)
- `docker exec delivery_app-db-1 pg_isready -U delivery_user` (container-based fallback)

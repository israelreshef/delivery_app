@echo off
setlocal enabledelayedexpansion
title TZIR Delivery - Services
echo ============================================
echo    TZIR Delivery - Backend + Frontend
echo ============================================
echo.

set "ROOT=%~dp0.."

call :start_stack
exit /b %ERRORLEVEL%

:start_stack
setlocal enabledelayedexpansion

echo [1/4] Cleaning up old processes on ports 5000 and 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo     Done.
echo.

:: ---- Database ----
set "DB_URL="
where docker >nul 2>&1
if !ERRORLEVEL! NEQ 0 goto :sqlite_fallback

echo [2/4] Docker found - checking if engine is running...
docker info >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo     WARNING: Docker engine is not running. Falling back to SQLite.
    goto :sqlite_fallback
)

echo     Starting PostgreSQL...
cd /d "!ROOT!"
set COMPOSE_ERR=0
docker compose up -d db 2>nul
if !ERRORLEVEL! NEQ 0 (
    docker-compose up -d db 2>nul
    if !ERRORLEVEL! NEQ 0 set COMPOSE_ERR=1
) else (
    set COMPOSE_ERR=0
)
if !COMPOSE_ERR! NEQ 0 (
    echo     WARNING: Failed to start PostgreSQL container. Falling back to SQLite.
    goto :sqlite_fallback
)

echo     Starting Redis (optional)...
docker compose up -d redis 2>nul
if !ERRORLEVEL! NEQ 0 (
    docker-compose up -d redis 2>nul
)
if !ERRORLEVEL! NEQ 0 echo     WARNING: Could not start Redis - continuing without it.

echo     Waiting for PostgreSQL to become ready (up to 30s)...
set DB_READY=
for /l %%i in (1,1,15) do (
    timeout /t 2 /nobreak >nul
    docker compose exec -T db pg_isready -U delivery_user >nul 2>&1
    if !ERRORLEVEL! EQU 0 set "DB_READY=1" & goto :db_ready
    docker exec delivery_app-db-1 pg_isready -U delivery_user >nul 2>&1
    if !ERRORLEVEL! EQU 0 set "DB_READY=1" & goto :db_ready
)
:db_ready
if defined DB_READY (
    echo     PostgreSQL is ready!
    set "DB_URL=postgresql://delivery_user:delivery_pass@localhost:5432/delivery_db"
) else (
    echo     WARNING: PostgreSQL did not become ready in time. Falling back to SQLite.
    goto :sqlite_fallback
)
goto :backend_start

:sqlite_fallback
echo [2/4] Using SQLite (no PostgreSQL available).
set "DB_URL=sqlite:///delivery_app.db"

:backend_start
echo.
echo [3/4] Starting Backend (Flask)...
if not exist "!ROOT!\backend\venv\Scripts\python.exe" (
    echo     Creating Python virtual environment...
    python -m venv "!ROOT!\backend\venv"
    echo     Installing dependencies...
    "!ROOT!\backend\venv\Scripts\pip.exe" install -r "!ROOT!\backend\requirements.txt" openpyxl apscheduler --quiet 2>nul
) else (
    echo     Verifying backend dependencies from requirements.txt...
    "!ROOT!\backend\venv\Scripts\pip.exe" install -r "!ROOT!\backend\requirements.txt" openpyxl apscheduler --quiet 2>nul
)
start "Backend - Flask" cmd /k "cd /d !ROOT!\backend && set DATABASE_URL=!DB_URL!&& set FLASK_ENV=development&& set SECRET_KEY=dev-secret-key-for-local-dev&& venv\Scripts\python.exe app.py"
echo     Backend:  http://localhost:5000
echo.

echo [4/4] Starting Frontend (Next.js)...
where node >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo     WARNING: Node.js not found in PATH. Skipping frontend.
    goto :done
)
if not exist "!ROOT!\frontend\node_modules" (
    echo     Installing frontend dependencies - npm ci...
    cd /d "!ROOT!\frontend"
    call npm ci --no-audit --no-fund --silent 2>nul
    if !ERRORLEVEL! NEQ 0 (
        call npm install --no-audit --no-fund --silent 2>nul
    )
    cd /d "!ROOT!"
)
start "Frontend - Next.js" cmd /k "cd /d !ROOT!\frontend && npm run dev"
echo     Frontend: http://localhost:3000

:done
echo.
echo     Services started. Returning to launcher.
echo.
exit /b 0
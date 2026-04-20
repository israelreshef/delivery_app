@echo off
chcp 65001 >nul 2>&1
title Delivery App Launcher
echo ============================================
echo    TZIR Delivery - Project Launcher
echo ============================================
echo.

set ADB_PATH=C:\Users\Israel\AppData\Local\Android\Sdk\platform-tools\adb.exe
set EMULATOR_PATH=C:\Users\Israel\AppData\Local\Android\Sdk\emulator\emulator.exe

:: Step 0: Kill old processes that might be occupying ports
echo [0/4] Cleaning up old processes...
taskkill /F /IM "qemu-system-x86_64.exe" >nul 2>&1
"%ADB_PATH%" kill-server >nul 2>&1
timeout /t 2 /nobreak >nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
:: Restart ADB fresh
"%ADB_PATH%" start-server >nul 2>&1
timeout /t 2 /nobreak >nul
echo     Old processes cleaned.
echo.

:: Step 1: Android Emulator (Cold Boot to avoid snapshot issues)
echo [1/4] Starting Android Emulator: Pixel_6a (Cold Boot)...
start "" "%EMULATOR_PATH%" -avd Pixel_6a -netdelay none -netspeed full -no-snapshot-load
echo     Emulator starting...
echo.

:: Step 2: Wait for emulator to be online via ADB
echo [2/4] Waiting for emulator to boot...

:: Wait up to 120 seconds for device to come online
set /a WAIT_COUNT=0
set /a MAX_WAIT=40
:wait_device
if %WAIT_COUNT% GEQ %MAX_WAIT% (
    echo     WARNING: Emulator did not come online after 120 seconds.
    echo     Continuing anyway - you may need to restart the emulator.
    goto :emulator_done
)
"%ADB_PATH%" devices 2>nul | findstr "emulator" | findstr /V "offline" | findstr "device" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo     Emulator connected to ADB!
    goto :wait_boot
)
timeout /t 3 /nobreak >nul
set /a WAIT_COUNT+=1
echo     Waiting for device... (%WAIT_COUNT%/%MAX_WAIT%)
goto :wait_device

:wait_boot
echo     Waiting for Android system to finish booting...
set /a BOOT_COUNT=0
:boot_loop
if %BOOT_COUNT% GEQ 30 (
    echo     WARNING: Boot did not complete in time. Continuing...
    goto :emulator_done
)
for /f "tokens=*" %%b in ('"%ADB_PATH%" -s emulator-5554 shell getprop sys.boot_completed 2^>nul') do (
    set BOOT_VAL=%%b
)
if "%BOOT_VAL%"=="1" (
    echo     Android system boot completed!
    goto :emulator_done
)
timeout /t 3 /nobreak >nul
set /a BOOT_COUNT+=1
goto :boot_loop

:emulator_done
echo.

:: Step 3: Backend - Python (with venv)
echo [3/4] Starting Backend (Flask + Python)...
start "Backend - Python" cmd /k "cd /d c:\Users\Israel\Desktop\delivery_app && call venv\Scripts\activate && cd backend && python app.py"
:: Give backend a moment to start
timeout /t 5 /nobreak >nul
echo     Backend started on http://localhost:5000
echo.

:: Step 4: Frontend - Node.js
echo [4/4] Starting Frontend (Next.js)...
start "Frontend - Node.js" cmd /k "cd /d c:\Users\Israel\Desktop\delivery_app\frontend && npm run dev"
echo     Frontend started on http://localhost:3000
echo.

echo ============================================
echo    All services started successfully!
echo ============================================
echo.
echo    Backend:  http://localhost:5000
echo    Frontend: http://localhost:3000
echo    Emulator: Pixel_6a
echo.
echo    Close this window anytime.
echo    To stop all services, close the CMD windows
echo    and the emulator.
echo ============================================
pause
@echo off
setlocal enabledelayedexpansion
title TZIR Delivery - Launcher (Full Stack)
echo ============================================
echo    TZIR Delivery - Full Stack Launcher
echo    Backend + Frontend + Courier Emulator
echo    + Customer Emulator
echo ============================================
echo.

set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
set EMULATOR=%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe
set ROOT=%~dp0
set "SCRIPTS=!ROOT!scripts\"

set COURIER_AVD=Pixel_7
set COURIER_SERIAL=emulator-5554
set CUSTOMER_AVD=Pixel_7_Customer
set CUSTOMER_SERIAL=emulator-5556

:: ---- Step 1: Services (Database + Backend + Frontend) ----
echo.
echo [1/5] Starting Database, Backend and Frontend...
call "!SCRIPTS!start-services.bat"

:: ---- Step 2: Launch emulators (two windows will open on screen) ----
:launch_emulators
echo.
echo [2/5] Launching emulators (two windows will open on screen)...
echo     Courier  : !COURIER_AVD!  ->  !COURIER_SERIAL!
echo     Customer : !CUSTOMER_AVD!  ->  !CUSTOMER_SERIAL!
call "!SCRIPTS!start-emulator.bat" "!ADB!" "!EMULATOR!" !COURIER_AVD! 5554
call "!SCRIPTS!start-emulator.bat" "!ADB!" "!EMULATOR!" !CUSTOMER_AVD! 5556

:: ---- Step 3: Build both mobile apps (parallel to emulator boot) ----
echo.
echo [3/5] Building mobile apps (emulators boot in parallel)...
if not exist "!ROOT!mobile-native\gradlew.bat" (
    echo     WARNING: Gradle wrapper not found. Skipping mobile build.
    goto :deploy_apps
)
cd /d "!ROOT!mobile-native"
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
call gradlew.bat :courierApp:assembleDebug :customerApp:assembleDebug --quiet
if !ERRORLEVEL! EQU 0 (
    echo     Mobile build OK.
) else (
    echo     WARNING: Mobile build failed - emulators will start but APKs may be stale.
)
cd /d "!ROOT!"

:: ---- Step 4: Deploy apps ----
:deploy_apps
echo.
echo [4/5] Deploying apps (waiting for devices to boot)...
if exist "!ROOT!mobile-native\courier-android\build\outputs\apk\debug\courierApp-debug.apk" (
    python "!SCRIPTS!mobile_deploy.py" !COURIER_SERIAL! "!ROOT!mobile-native\courier-android\build\outputs\apk\debug\courierApp-debug.apk" com.tzir.delivery.courier .MainActivity --launch --adb "!ADB!" --label courier
) else (
    echo     WARNING: Courier APK not found - skipping deploy.
)

if exist "!ROOT!mobile-native\customer-android\build\outputs\apk\debug\customerApp-debug.apk" (
    python "!SCRIPTS!mobile_deploy.py" !CUSTOMER_SERIAL! "!ROOT!mobile-native\customer-android\build\outputs\apk\debug\customerApp-debug.apk" com.tzir.delivery.customer .MainActivity --launch --adb "!ADB!" --label customer
) else (
    echo     WARNING: Customer APK not found - skipping deploy.
)

:: ---- Step 5: Summary ----
:summary
echo.
echo ============================================
echo    All services started!
echo ============================================
echo.
echo    Backend:        http://localhost:5000
echo    Frontend/admin: http://localhost:3000
echo    Courier app:    !COURIER_SERIAL!  (AVD !COURIER_AVD!)
echo    Customer app:   !CUSTOMER_SERIAL!  (AVD !CUSTOMER_AVD!)
echo.
echo    Testing flow:
echo      1. Place an order inside the Customer emulator.
echo      2. Accept/fulfill it inside the Courier emulator.
echo      3. Confirm the whole process in the admin UI on localhost:3000.
echo.
echo    Close this window to stop everything.
echo    Or press a key for a clean shutdown.
echo ============================================
echo.
echo Press any key to stop all services...
pause >nul
echo.
echo Shutting down...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo     Released ports 5000 and 3000.
echo All services stopped.
timeout /t 2 /nobreak >nul
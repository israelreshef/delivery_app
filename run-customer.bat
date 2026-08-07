@echo off
setlocal enabledelayedexpansion
title TZIR Delivery - Customer App Only
echo ============================================
echo    TZIR Delivery - Customer App Launcher
echo ============================================
echo.

set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
set EMULATOR=%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe
set ROOT=%~dp0
set "SCRIPTS=!ROOT!scripts\"

set CUSTOMER_AVD=Pixel_7_Customer
set CUSTOMER_SERIAL=emulator-5556
set COURIER_SERIAL=emulator-5554

:: ---- Step 1: Services (Database + Backend + Frontend) ----
echo.
echo [1/4] Starting Database, Backend and Frontend...
call "!SCRIPTS!start-services.bat"

:: ---- Step 2: Build customer app ----
echo.
echo [2/4] Building customer app...
if not exist "!ROOT!mobile-native\gradlew.bat" (
    echo     WARNING: Gradle wrapper not found. Skipping mobile build.
    goto :launch_emulator
)
cd /d "!ROOT!mobile-native"
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
call gradlew.bat :customerApp:assembleDebug --quiet
if !ERRORLEVEL! EQU 0 (
    echo     Customer build OK.
) else (
    echo     WARNING: Customer build failed - using existing APK if present.
)
cd /d "!ROOT!"

:: ---- Step 3: Launch customer emulator ----
:launch_emulator
echo.
echo [3/4] Launching customer emulator (!CUSTOMER_AVD! -> !CUSTOMER_SERIAL!)...
call "!SCRIPTS!start-emulator.bat" "!ADB!" "!EMULATOR!" !CUSTOMER_AVD! 5556

:: ---- Step 4: Deploy customer app ----
echo.
echo [4/4] Deploying customer app...
if exist "!ROOT!mobile-native\customer-android\build\outputs\apk\debug\customerApp-debug.apk" (
    python "!SCRIPTS!mobile_deploy.py" !CUSTOMER_SERIAL! "!ROOT!mobile-native\customer-android\build\outputs\apk\debug\customerApp-debug.apk" com.tzir.delivery.customer .MainActivity --launch --adb "!ADB!" --label customer
) else (
    echo     WARNING: Customer APK not found - skipping deploy.
)

:: ---- Summary ----
echo.
echo ============================================
echo    Customer app is ready!
echo ============================================
echo.
echo    Backend:        http://localhost:5000
echo    Frontend:       http://localhost:3000
echo    Customer app:   !CUSTOMER_SERIAL!  (AVD !CUSTOMER_AVD!)
echo.
echo    Note: the Courier emulator (!COURIER_SERIAL!) is NOT launched here.
echo    Use run-courier.bat for that.
echo.
echo    Press any key to stop all services...
pause >nul
echo.
echo Shutting down...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo All services stopped.
timeout /t 2 /nobreak >nul
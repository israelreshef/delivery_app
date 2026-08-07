@echo off
setlocal enabledelayedexpansion
title TZIR Delivery - Courier App Only
echo ============================================
echo    TZIR Delivery - Courier App Launcher
echo ============================================
echo.

set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
set EMULATOR=%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe
set ROOT=%~dp0
set "SCRIPTS=!ROOT!scripts\"

set COURIER_AVD=Pixel_7
set COURIER_SERIAL=emulator-5554
set CUSTOMER_SERIAL=emulator-5556

:: ---- Step 1: Services (Database + Backend + Frontend) ----
echo.
echo [1/4] Starting Database, Backend and Frontend...
call "!SCRIPTS!start-services.bat"

:: ---- Step 2: Build courier app ----
echo.
echo [2/4] Building courier app...
if not exist "!ROOT!mobile-native\gradlew.bat" (
    echo     WARNING: Gradle wrapper not found. Skipping mobile build.
    goto :launch_emulator
)
cd /d "!ROOT!mobile-native"
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
call gradlew.bat :courierApp:assembleDebug --quiet
if !ERRORLEVEL! EQU 0 (
    echo     Courier build OK.
) else (
    echo     WARNING: Courier build failed - using existing APK if present.
)
cd /d "!ROOT!"

:: ---- Step 3: Launch courier emulator ----
:launch_emulator
echo.
echo [3/4] Launching courier emulator (!COURIER_AVD! -> !COURIER_SERIAL!)...
call "!SCRIPTS!start-emulator.bat" "!ADB!" "!EMULATOR!" !COURIER_AVD! 5554

:: ---- Step 4: Deploy courier app ----
echo.
echo [4/4] Deploying courier app...
if exist "!ROOT!mobile-native\courier-android\build\outputs\apk\debug\courierApp-debug.apk" (
    python "!SCRIPTS!mobile_deploy.py" !COURIER_SERIAL! "!ROOT!mobile-native\courier-android\build\outputs\apk\debug\courierApp-debug.apk" com.tzir.delivery.courier .MainActivity --launch --adb "!ADB!" --label courier
) else (
    echo     WARNING: Courier APK not found - skipping deploy.
)

:: ---- Summary ----
echo.
echo ============================================
echo    Courier app is ready!
echo ============================================
echo.
echo    Backend:     http://localhost:5000
echo    Frontend:    http://localhost:3000
echo    Courier app: !COURIER_SERIAL!  (AVD !COURIER_AVD!)
echo.
echo    Note: the Customer emulator (!CUSTOMER_SERIAL!) is NOT launched here.
echo    Use run-customer.bat for that.
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
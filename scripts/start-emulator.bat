@echo off
setlocal enabledelayedexpansion
REM Starts an Android emulator with a fixed port unless it is already online.
REM Usage: start-emulator.bat <ADB_EXE> <EMULATOR_EXE> <AVD_NAME> <PORT>

set ADB_EXE=%~1
set EMULATOR_EXE=%~2
set AVD_NAME=%~3
set PORT=%~4
set "ROOT=%~dp0.."

"%ADB_EXE%" devices | findstr "emulator-%PORT%" | findstr "device" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo     [%~3] Emulator already online on port %PORT%. Skipping launch.
    exit /b 0
)

if not exist "%EMULATOR_EXE%" (
    echo     WARNING: Emulator executable not found: %EMULATOR_EXE%
    exit /b 1
)

echo     [%~3] Launching emulator on port %PORT%...
if not exist "%ROOT%logs" mkdir "%ROOT%logs"
start "" "%EMULATOR_EXE%" -avd %AVD_NAME% -port %PORT% -netdelay none -netspeed full -no-snapshot-load > "%ROOT%logs\emulator-%PORT%.log" 2>&1
exit /b 0
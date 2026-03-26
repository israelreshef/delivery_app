@echo off
title Delivery App Launcher
echo Starting Delivery App...

:: Android Emulator
echo Starting Android Emulator: Pixel_6a...
start "" "C:\Users\Israel\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Pixel_6a -netdelay none -netspeed full

:: המתן 15 שניות עד שהאמולטור יעלה
echo Waiting for emulator to boot...
timeout /t 15 /nobreak

:: Backend - Python (with venv)
echo Starting Backend...
start "Backend - Python" cmd /k "cd /d c:\Users\Israel\Desktop\delivery_app && call venv\Scripts\activate && cd backend && python app.py"

:: Frontend - Node.js
echo Starting Frontend...
start "Frontend - Node.js" cmd /k "cd /d c:\Users\Israel\Desktop\delivery_app\frontend && npm run dev"

echo Done! Everything is starting...
echo Emulator may take a minute to fully boot.
pause
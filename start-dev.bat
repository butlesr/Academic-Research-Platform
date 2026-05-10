@echo off
title Academic Research Platform - Development Mode
color 0B

echo Starting Academic Research Platform...
echo.

:: Start backend in new window
start "Backend API (Port 5000)" cmd /k "cd /d "%~dp0backend" && echo Starting Backend API... && npm run dev"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "Frontend App (Port 3000)" cmd /k "cd /d "%~dp0frontend" && echo Starting Frontend... && npm run dev"

:: Wait 5 seconds then open browser
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo.
echo ============================================================
echo   App is starting up!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo   API Docs: http://localhost:5000/health
echo ============================================================
echo.
echo Close this window and the two server windows to stop the app.
echo.
pause

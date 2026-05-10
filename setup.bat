@echo off
title Academic Research Platform - Setup Script
color 0A

echo.
echo ============================================================
echo   ACADEMIC RESEARCH PLATFORM - QUICK SETUP
echo ============================================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/  (Download LTS version)
    echo.
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

:: Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found. Please reinstall Node.js.
    pause
    exit /b 1
)

echo [OK] npm found:
npm --version
echo.

:: Install backend dependencies
echo [1/3] Installing backend packages (this takes 2-3 minutes)...
echo.
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend installation failed. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] Backend packages installed!
cd ..
echo.

:: Install frontend dependencies
echo [2/3] Installing frontend packages (this takes 3-5 minutes)...
echo.
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend installation failed. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] Frontend packages installed!
cd ..
echo.

:: Create .env if it doesn't exist
echo [3/3] Setting up environment files...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo [OK] Created backend\.env from template
    echo.
    echo IMPORTANT: Edit backend\.env and add your database credentials!
) else (
    echo [OK] backend\.env already exists
)
echo.

echo ============================================================
echo   SETUP COMPLETE!
echo ============================================================
echo.
echo Next steps:
echo.
echo 1. Edit backend\.env with your database credentials
echo    (See DEPLOYMENT_GUIDE.md for instructions)
echo.
echo 2. To run the app locally:
echo    - Open TWO Command Prompt windows
echo    - Window 1: cd backend  then  npm run dev
echo    - Window 2: cd frontend then  npm run dev
echo.
echo 3. Open browser: http://localhost:3000
echo.
echo 4. For full deployment guide, read: DEPLOYMENT_GUIDE.md
echo.
pause

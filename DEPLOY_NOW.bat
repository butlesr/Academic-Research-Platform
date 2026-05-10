@echo off
title Deploy Academic Platform — Final Steps
color 0B

echo.
echo ============================================================
echo   ACADEMIC RESEARCH PLATFORM — DEPLOY TO CLOUD
echo   Claude has done all the setup. Just follow these steps!
echo ============================================================
echo.

:: --------------------------------------------------------
:: STEP 1 — Push to GitHub
:: --------------------------------------------------------
echo [STEP 1] Pushing code to GitHub...
echo.
echo First, go to: https://github.com/new
echo Create a NEW repository:
echo   - Repository name: academic-research-platform
echo   - Set to: Private
echo   - Click: Create repository (DO NOT add README)
echo.
set /p GITHUB_URL="Paste your GitHub repository URL here (e.g. https://github.com/yourname/academic-research-platform.git): "

git remote add origin %GITHUB_URL%
git branch -M main
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Push failed. Common fixes:
    echo   - Make sure you created the repository on GitHub first
    echo   - Enter your GitHub username and password when prompted
    echo   - If asked for password, use a Personal Access Token:
    echo     Go to GitHub → Settings → Developer Settings → Personal Access Tokens
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Code pushed to GitHub!
echo.

:: --------------------------------------------------------
:: STEP 2 — Deploy frontend to Vercel (CLI)
:: --------------------------------------------------------
echo [STEP 2] Logging into Vercel and deploying frontend...
echo.
echo A browser will open — click "Continue with Email" and enter: butlesr@gmail.com
echo After logging in, come back to this window.
echo.
vercel login
echo.

echo Deploying frontend to Vercel...
cd frontend
vercel deploy --yes --prod --name academic-research-platform

if %errorlevel% neq 0 (
    echo.
    echo [INFO] If Vercel deploy failed, do it manually:
    echo   1. Go to https://vercel.com/new
    echo   2. Import: academic-research-platform from GitHub
    echo   3. Root Directory: frontend
    echo   4. Click Deploy
    echo.
)

cd ..

echo.
echo ============================================================
echo   CODE IS ON GITHUB AND FRONTEND IS DEPLOYING!
echo.
echo   NOW YOU NEED TO:
echo.
echo   1. Get backend URL from Railway (see DEPLOYMENT_GUIDE.md Step 3)
echo   2. Open: backend\.env  — fill in the *** REQUIRED *** values
echo   3. Go to Vercel project settings → Environment Variables
echo      Add: NEXT_PUBLIC_API_URL = your-railway-backend-url
echo      Add: NEXT_PUBLIC_WS_URL  = your-railway-backend-url
echo.
echo   Full guide: open DEPLOYMENT_GUIDE.md
echo ============================================================
echo.
pause

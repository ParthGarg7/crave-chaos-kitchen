@echo off
title CRAVE - Food Delivery App

echo.
echo  ██████╗██████╗  █████╗ ██╗   ██╗███████╗
echo ██╔════╝██╔══██╗██╔══██╗██║   ██║██╔════╝
echo ██║     ██████╔╝███████║██║   ██║█████╗  
echo ██║     ██╔══██╗██╔══██║╚██╗ ██╔╝██╔══╝  
echo ╚██████╗██║  ██║██║  ██║ ╚████╔╝ ███████╗
echo  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝
echo.
echo  Food Delivery App  ^|  Starting all services...
echo ────────────────────────────────────────────────

:: Check Docker is running
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Docker is not running!
    echo  Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo  [OK] Docker is running
echo.

:: Stop any old containers first (clean slate)
echo  Stopping any existing containers...
docker-compose down --remove-orphans > nul 2>&1

:: Build + start everything
echo  Building and starting all services...
echo  (This may take 2-3 minutes on first run while Docker pulls images)
echo.
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] docker-compose failed. Check the output above.
    pause
    exit /b 1
)

echo.
echo  Waiting for services to become healthy...

:: Simple wait loop - check backend health
set /a attempts=0
:wait_loop
set /a attempts+=1
if %attempts% gtr 30 (
    echo  [WARN] Backend took too long — it might still be starting up.
    goto :show_info
)
timeout /t 3 /nobreak > nul
curl -s -f http://localhost:8000/health > nul 2>&1
if %errorlevel% equ 0 goto :ready
echo  Waiting... (%attempts%/30)
goto :wait_loop

:ready
echo  [OK] Backend is healthy!

:show_info
echo.
echo ════════════════════════════════════════════════
echo   CRAVE is LIVE!
echo ════════════════════════════════════════════════
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo ── Demo Login Credentials ───────────────────────
echo.
echo   CUSTOMER
echo     Email:    customer@example.com
echo     Password: password123
echo.
echo   RESTAURANT OWNER
echo     Email:    restaurant@example.com
echo     Password: password123
echo.
echo   DRIVER
echo     Email:    driver@example.com
echo     Password: password123
echo.
echo   ADMIN
echo     Email:    admin@example.com
echo     Password: admin123
echo.
echo ─────────────────────────────────────────────────
echo   Press any key to open the app in your browser
echo ─────────────────────────────────────────────────
pause > nul
start http://localhost:3000

echo.
echo   Running! To stop: docker-compose down
echo.

@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   IMS - Starting Web Application Services
echo ============================================
echo.

:: Change to project root directory
cd /d "%~dp0.."

:: ----------------------------------------
:: 1. Start Docker services if not running
:: ----------------------------------------
echo [1/3] Checking Docker services...

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

:: Start Docker Compose (will only start containers not already running)
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start Docker services
    pause
    exit /b 1
)
echo Docker services started successfully
echo.

:: ----------------------------------------
:: 2. Start API server if not running
:: ----------------------------------------
echo [2/3] Checking API server (port 3001)...

:: Check if port 3001 is in use
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo Starting API server...
    start "IMS-API" cmd /c "cd /d "%~dp0..\apps\api" && pnpm run dev"
    call :wait_for_port 3001 "API server"
) else (
    echo API server is already running on port 3001
)
echo.

:: ----------------------------------------
:: 3. Start Web server if not running
:: ----------------------------------------
echo [3/3] Checking Web server (port 3000)...

:: Check if port 3000 is in use
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo Starting Web server...
    start "IMS-Web" cmd /c "cd /d "%~dp0..\apps\web" && pnpm run dev"
    call :wait_for_port 3000 "Web server"
) else (
    echo Web server is already running on port 3000
)
echo.

:: ----------------------------------------
:: Done
:: ----------------------------------------
echo ============================================
echo   All Web Application Services Started!
echo ============================================
echo.
echo   Web App:       http://localhost:3000
echo   API:           http://localhost:3001
echo   API Docs:      http://localhost:3001/api/docs
echo   Elasticsearch: http://localhost:9200
echo   Mailpit:       http://localhost:8025
echo   MinIO:         http://localhost:9001
echo.
echo Press any key to close this window...
pause >nul
exit /b 0

:: ----------------------------------------
:: Subroutine: Wait for port to be available
:: ----------------------------------------
:wait_for_port
set PORT=%1
set NAME=%~2
echo Waiting for %NAME% to start on port %PORT%...
set /a ATTEMPTS=0
:wait_loop
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    set /a ATTEMPTS+=1
    if !ATTEMPTS! geq 30 (
        echo WARNING: %NAME% did not start within 60 seconds
        goto :eof
    )
    timeout /t 2 /nobreak >nul
    goto wait_loop
)
echo %NAME% started on port %PORT%
goto :eof

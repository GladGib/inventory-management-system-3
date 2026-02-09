@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   IMS - Stopping All Services
echo ============================================
echo.

:: Change to project root directory
cd /d "%~dp0.."

:: ----------------------------------------
:: 1. Stop Node.js processes on ports 3000 and 3001
:: ----------------------------------------
echo [1/2] Stopping application servers...

:: Stop process on port 3000 (Web)
call :stop_port 3000 "Web server"

:: Stop process on port 3001 (API)
call :stop_port 3001 "API server"

:: Stop process on port 8081 (Expo dev server)
call :stop_port 8081 "Expo dev server"

:: Also kill any lingering cmd windows with IMS titles
taskkill /F /FI "WINDOWTITLE eq IMS-API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq IMS-Web*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq IMS-Mobile*" >nul 2>&1

echo Application servers stopped
echo.

:: ----------------------------------------
:: 2. Stop Docker services
:: ----------------------------------------
echo [2/2] Stopping Docker services...

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker is not running, skipping Docker cleanup
) else (
    docker-compose down
    if errorlevel 1 (
        echo WARNING: Failed to stop some Docker services
    ) else (
        echo Docker services stopped
    )
)
echo.

:: ----------------------------------------
:: Done
:: ----------------------------------------
echo ============================================
echo   All Services Stopped!
echo ============================================
echo.
echo Press any key to close this window...
pause >nul
exit /b 0

:: ----------------------------------------
:: Subroutine: Stop process on a port
:: ----------------------------------------
:stop_port
set PORT=%1
set NAME=%~2
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING" 2^>nul') do (
    if not "%%a"=="" (
        echo Stopping %NAME% ^(PID: %%a^)...
        taskkill /F /PID %%a >nul 2>&1
    )
)
goto :eof

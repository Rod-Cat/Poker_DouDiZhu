@echo off
title 斗地主 - 联机对战

:: switch to bat directory
cd /d "%~dp0"

:: check node.exe exists
if not exist "nodejs\node.exe" (
    echo.
    echo ================================================
    echo   [X] Error: nodejs\node.exe not found
    echo   Please keep nodejs folder next to this bat
    echo ================================================
    echo.
    pause
    exit
)

echo.
echo ================================================
echo    斗地主 - 联机对战  v1.0
echo ================================================
echo.
echo   [*] Starting server, please wait...
echo.

:: start server in its own visible window
set NODE_ENV=production
start "Doudizhu Server" /D "%~dp0" nodejs\node.exe server\index.js

:: wait for server to start
echo   [*] Waiting for server (5 seconds)...
timeout /t 5 /nobreak >nul

:: check if server is running
curl -s -o NUL http://localhost:3000 2>NUL
if errorlevel 1 (
    echo.
    echo   [!] Still initializing, waiting 5 more seconds...
    timeout /t 5 /nobreak >nul
    curl -s -o NUL http://localhost:3000 2>NUL
    if errorlevel 1 (
        echo.
        echo ================================================
        echo   [X] Server failed to start!
        echo   Check the "Doudizhu Server" window for errors
        echo   Common issues:
        echo   1. Port 3000 is in use by another app
        echo   2. Database corrupted (delete server\data folder)
        echo ================================================
        echo.
        pause
        exit
    )
)

:: open browser
echo   [*] Opening browser...
start http://localhost:3000

echo.
echo ================================================
echo   [OK] Server started successfully!
echo.
echo   Local URL:  http://localhost:3000
echo   LAN  URL:   see server window above
echo.
echo   Close this window to stop the server
echo ================================================
echo.
pause

:: cleanup server process
taskkill /FI "WINDOWTITLE eq Doudizhu Server" /F >NUL 2>&1

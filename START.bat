@echo off
echo ========================================
echo   Back Office CRM - Starting Up
echo ========================================
echo.

echo [1/3] Stopping any old server processes...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/3] Starting backend on port 5000...
start "CRM Backend" cmd /k "node server/index.js"
timeout /t 3 /nobreak >nul

echo [3/3] Starting frontend on port 3000...
start "CRM Frontend" cmd /k "npm start"

echo.
echo ========================================
echo   CRM is starting!
echo   Open browser:      http://localhost:3000
echo   Backend API:       http://localhost:5000
echo   WebSocket (calls): ws://localhost:5001
echo ========================================
echo.
pause

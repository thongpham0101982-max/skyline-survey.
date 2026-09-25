@echo off
title Skyline Portal 24/7
cd /d "%~dp0"

echo ====================================================
echo   SQMS - 24/7 (PORT 3000)
echo   Dia chi truy cap: http://192.168.10.239:3000
echo ====================================================

:: Dung cac tien trinh cu dang giu port 3000 neu co
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)

:: Khoi chay Node.js 24/7 trong cua so rieng doc lap
echo Dang khoi chay Skyline Server qua Node.js...
start "Skyline Server 24/7" /min node server.js
exit /b 0

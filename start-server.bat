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
ping 127.0.0.1 -n 3 >nul

:: Khoi chay Node.js 24/7 voi dinh muc bo nho toi uu (GC V8 toi uu duoi 2GB RAM)
echo Dang khoi chay Skyline Server qua Node.js (Toi uu bo nho)...
start "Skyline Server 24/7" /min node --max-old-space-size=2048 server.js
exit /b 0

@echo off
title Tat Skyline Survey Server
cd /d "%~dp0"
echo ====================================================
echo   Dang dung Skyline Survey Server tren port 3000...
echo ====================================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Tat tien trinh PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

taskkill /F /FI "WINDOWTITLE eq Skyline Survey*" >nul 2>&1

echo.
echo Da dung server thanh cong!
echo.
pause

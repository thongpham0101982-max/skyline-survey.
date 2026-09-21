@echo off
title Skyline Portal 24/7
cd /d "%~dp0"

echo ====================================================
echo   SKYLINE SURVEY SYSTEM - 24/7 (PORT 3000)
echo   Dia chi truy cap: http://192.168.10.239:3000
echo ====================================================

:: Thu khoi dong bang PM2
call pm2 start ecosystem.config.js >nul 2>&1
ping 127.0.0.1 -n 3 >nul
netstat -aon | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    call pm2 save >nul 2>&1
    echo Khoi chay thanh cong qua PM2.
    exit /b 0
)

:: Neu PM2 khong kha dung, chay bang Node truc tiep
echo PM2 chua san sang, khoi chay truc tiep qua Node.js...
start "Skyline Server 24/7" /min node server.js
exit /b 0

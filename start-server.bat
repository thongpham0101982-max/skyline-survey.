@echo off
title Skyline Survey Production Server
cd /d "%~dp0"

echo ====================================================
echo   SKYLINE SURVEY SYSTEM - PRODUCTION SERVER (PORT 3000)
echo   Dang chay tai dia chi: http://192.168.10.239:3000
echo ====================================================

:loop
echo [%date% %time%] Khoi dong server...
call npx next start -H 0.0.0.0 -p 3000
echo [%date% %time%] Server da dung. Tu dong khoi dong lai sau 5 giay...
timeout /t 5 /nobreak >nul
goto loop

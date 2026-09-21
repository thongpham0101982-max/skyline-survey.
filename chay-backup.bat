@echo off
title Skyline Survey - Sao Luu Du Lieu Tu Dong
cd /d "%~dp0"

if not exist "%~dp0logs" (
    mkdir "%~dp0logs"
)

echo [%date% %time%] Khoi chay tien trinh sao luu du lieu... >> "%~dp0logs\backup.log"
call node scripts\backup-db.js --trigger=WINDOWS_SCHEDULER >> "%~dp0logs\backup.log" 2>&1
echo [%date% %time%] Hoan tat tien trinh sao luu. >> "%~dp0logs\backup.log"

@echo off
title Huy Lich Sao luu Du lieu - Skyline Survey
cd /d "%~dp0"

echo Dang huy tac vu SkylineSurvey_WeeklyBackup tren Windows Task Scheduler...
schtasks /delete /tn "SkylineSurvey_WeeklyBackup" /f

if %ERRORLEVEL% EQU 0 (
    echo [OK] Da huy lich sao luu tu dong thanh cong!
) else (
    echo [THONG BAO] Tac vu khong ton tai hoac can quyen Administrator.
)

echo.
pause

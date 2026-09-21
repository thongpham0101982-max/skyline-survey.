@echo off
title Cai dat Lich Sao luu Du lieu - Skyline Survey
cd /d "%~dp0"

echo ====================================================================
echo   CAI DAT LICH TU DONG SAO LUU DU LIEU (BACKUP)
echo   Thoi gian: 23:00, Thu 6 hang tuan
echo ====================================================================
echo.

set SCRIPT_PATH=%~dp0chay-backup.bat
set TASK_NAME=SkylineSurvey_WeeklyBackup

echo Dang tao tac vu tren Windows Task Scheduler...
schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc weekly /d FRI /st 23:00 /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================================
    echo [OK] DA CAI DAT THANH CONG LICH SAO LUU TU DONG!
    echo   - Ten tac vu: %TASK_NAME%
    echo   - Chu ky: Thu 6 hang tuan vao luc 23:00
    echo   - File thuc thi: %SCRIPT_PATH%
    echo   - File sao luu se duoc luu tai: %~dp0data-backups\
    echo ====================================================================
) else (
    echo.
    echo [CANH BAO] Khong the tao tac vu qua schtasks. Vui long click chuot phai
    echo chon 'Run as administrator' (Chay voi quyen Quan tri vien) de cai dat.
)

echo.
pause

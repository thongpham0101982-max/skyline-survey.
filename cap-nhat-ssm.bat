@echo off
title CAP NHAT HE THONG SKYLINE SURVEY (SSM SERVER)

echo =======================================================
echo       CAP NHAT VA KHOI DONG LAI MAY CHU SSM
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/5] Dang keo ma nguon moi nhat tu GitHub (git pull)...
git pull origin main
if %ERRORLEVEL% neq 0 (
    echo [Loi] Khong the pull tu GitHub. Vui long kiem tra ket noi mang.
    pause
    exit /b 1
)

echo.
echo [2/5] Dang tam dung tien trinh dang chay tren port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Dung PID: %%a
    taskkill /F /T /PID %%a >nul 2>&1
)
ping 127.0.0.1 -n 3 >nul

echo.
echo [3/5] Dang cap nhat Prisma Client...
call npx prisma generate

echo.
echo [4/5] Dang build du an Next.js (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [Loi] Build that bai! Dang khoi phuc server...
    if exist "%~dp0chay-ngam.vbs" (
        wscript.exe "%~dp0chay-ngam.vbs"
    ) else (
        start "" "%~dp0start-server.bat"
    )
    pause
    exit /b 1
)

echo.
echo [5/5] Dang khoi dong lai may chu...
if exist "%~dp0chay-ngam.vbs" (
    wscript.exe "%~dp0chay-ngam.vbs"
) else (
    start "" "%~dp0start-server.bat"
)

echo.
echo =======================================================
echo   CAP NHAT THANH CONG!
echo   Dia chi truy cap: http://192.168.10.239:3000
echo   Domain: https://ssm.skylineschool.edu.vn
echo =======================================================
echo.
pause

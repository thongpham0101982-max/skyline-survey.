@echo off
chcp 65001 >nul
title CẬP NHẬT HỆ THỐNG SKYLINE SURVEY (MÁY CHỦ SSM)

echo =======================================================
echo       CẬP NHẬT VÀ KHỞI ĐỘNG LẠI MÁY CHỦ SSM
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/5] Đang kéo mã nguồn mới nhất từ GitHub (git pull origin main)...
git pull origin main
if %ERRORLEVEL% neq 0 (
    echo [Lỗi] Không thể pull từ GitHub. Đang kiểm tra trạng thái git...
    git status
    echo.
    echo Vui lòng kiểm tra kết nối mạng hoặc liên hệ quản trị viên.
    pause
    exit /b 1
)

echo.
echo [2/5] Đang tạm dừng dịch vụ chạy trên cổng 3000...
call pm2 stop skyline-portal >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Dừng tiến trình cũ PID: %%a
    taskkill /F /T /PID %%a >nul 2>&1
)
ping 127.0.0.1 -n 3 >nul

echo.
echo [3/5] Đang đồng bộ và cập nhật Prisma Client...
call npx prisma generate

echo.
echo [4/5] Đang build dự án Next.js (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [Lỗi] Quá trình build thất bại! Đang khôi phục lại máy chủ...
    call pm2 start ecosystem.config.js >nul 2>&1
    if exist "%~dp0chay-ngam.vbs" (
        wscript.exe "%~dp0chay-ngam.vbs"
    ) else if exist "%~dp0start-server.bat" (
        start "" "%~dp0start-server.bat"
    )
    pause
    exit /b 1
)

echo.
echo [5/5] Đang khởi động lại dịch vụ máy chủ SSM (PM2 / 24/7)...
call pm2 restart skyline-portal >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call pm2 start ecosystem.config.js >nul 2>&1
)
ping 127.0.0.1 -n 3 >nul
netstat -aon | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    call pm2 save >nul 2>&1
) else (
    echo Đang khởi chạy qua dịch vụ nền Node.js...
    if exist "%~dp0chay-ngam.vbs" (
        wscript.exe "%~dp0chay-ngam.vbs"
    ) else if exist "%~dp0start-server.bat" (
        start "" "%~dp0start-server.bat"
    ) else (
        start "Skyline Server" /min node server.js
    )
)

echo.
echo =======================================================
echo   CẬP NHẬT THÀNH CÔNG!
echo   Hệ thống máy chủ SSM đã sẵn sàng hoạt động:
echo   - Nội bộ: http://192.168.10.239:3000
echo   - Tên miền: https://ssm.skylineschool.edu.vn
echo =======================================================
echo.
pause

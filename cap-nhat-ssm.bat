@echo off
chcp 65001 >nul
title CẬP NHẬT HỆ THỐNG SKYLINE SURVEY (SSM SERVER)

echo =======================================================
echo       CẬP NHẬT VÀ KHỞI ĐỘNG LẠI MÁY CHỦ SSM
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/4] Đang kéo mã nguồn mới nhất từ GitHub (git pull)...
git pull origin main
if %ERRORLEVEL% neq 0 (
    echo [Lỗi] Không thể pull từ GitHub. Vui lòng kiểm tra kết nối mạng.
    pause
    exit /b 1
)

echo.
echo [2/4] Đang cập nhật Prisma Client...
call npx prisma generate

echo.
echo [3/4] Đang tiến hành Build dự án Next.js (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [Lỗi] Quá trình Build thất bại!
    pause
    exit /b 1
)

echo.
echo [4/4] Đang khởi động lại dịch vụ máy chủ...
where pm2 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Đang reload dịch vụ PM2 (skyline-portal)...
    call pm2 reload skyline-portal || call pm2 restart ecosystem.config.js
    call pm2 save
) else (
    echo Khởi động lại qua script start-server.bat...
    call "%~dp0tat-server.bat"
    start "" "%~dp0start-server.bat"
)

echo.
echo =======================================================
echo   CẬP NHẬT THÀNH CÔNG!
echo   Hệ thống SSM đã được cập nhật phiên bản mới nhất.
echo   Địa chỉ truy cập: https://ssm.skylineschool.edu.vn
echo =======================================================
echo.
pause

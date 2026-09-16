@echo off
chcp 65001 >nul
title ĐỒNG BỘ CODE LÊN VERCEL (SKYLINE-SURVEY)

echo =======================================================
echo          TỰ ĐỘNG ĐỒNG BỘ CODE LÊN VERCEL
echo =======================================================
echo.

:: Di chuyển vào thư mục dự án nếu đang ở ngoài thư mục cha
if exist "skyline-survey" (
    cd skyline-survey
)

:: Kiểm tra git
git status >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Không tìm thấy Git repository trong thư mục!
    echo Vui lòng kiểm tra lại đường dẫn thư mục dự án.
    goto END
)

echo [1/3] Đang kiểm tra các file có thay đổi...
git status -s
echo.

:: Nhập ghi chú commit nếu muốn (mặc định lấy thời gian hiện tại)
set "MSG="
set /p "MSG=Nhập nội dung cập nhật (hoặc nhấn Enter để tự động): "
if "%MSG%"=="" (
    set "MSG=Cap nhat code ngay %date% %time%"
)

echo.
echo [2/3] Đang lưu thay đổi (commit)...
git add .
git commit -m "%MSG%"

echo.
echo [3/3] Đang đẩy code lên GitHub để Vercel tự động build...
git push origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo =======================================================
    echo   THÀNH CÔNG! Code đã được đẩy lên GitHub.
    echo   Vercel đang tự động build và cập nhật trang web:
    echo   https://skyline-survey.vercel.app
    echo =======================================================
) else (
    echo.
    echo =======================================================
    echo   [LỖI] Đẩy code thất bại. Vui lòng kiểm tra kết nối mạng
    echo   hoặc quyền truy cập GitHub!
    echo =======================================================
)

:END
echo.
echo Nhấn phím bất kỳ để thoát...
pause >nul

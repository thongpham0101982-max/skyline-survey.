@echo off
title Cai dat Skyline Survey tu dong chay cung Windows
cd /d "%~dp0"

echo ================================================================
echo   CAI DAT SKYLINE SURVEY TU DONG KHOI DONG CUNG WINDOWS
echo ================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startup = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup); $s = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $startup 'SkylineSurvey.lnk')); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"\"\"%~dp0chay-ngam.vbs\"\"\"'; $s.WorkingDirectory = '%~dp0'; $s.Save()"

if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SkylineSurvey.lnk" (
    echo [OK] Da cai dat thanh cong! 
    echo Tu bay gio moi khi bat may tinh, website se TU DONG CHAY NGAM.
    echo Ban khong can phai mo cua so lenh hay mo VS Code nua.
) else (
    echo [LOI] Khong the tao shortcut vao thu muc Startup.
)
echo.
pause

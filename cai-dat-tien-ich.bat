@echo off
title Cai dat Tien ich Quan ly Skyline Survey tren Windows
cd /d "%~dp0"

echo ================================================================
echo   CAI DAT TIEN ICH KHAY HE THONG (SYSTEM TRAY) CHO SKYLINE
echo ================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory); " ^
    "$startup = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup); " ^
    "$icon = '%~dp0public\favicon.ico'; " ^
    "$wsh = New-Object -ComObject WScript.Shell; " ^
    "$scDesktop = $wsh.CreateShortcut((Join-Path $desktop 'Skyline Survey Server.lnk')); " ^
    "$scDesktop.TargetPath = 'wscript.exe'; " ^
    "$scDesktop.Arguments = '\"\"\"%~dp0SkylineTray.vbs\"\"\"'; " ^
    "$scDesktop.WorkingDirectory = '%~dp0'; " ^
    "$scDesktop.Description = 'Tien ich quan ly Skyline Survey'; " ^
    "if (Test-Path $icon) { $scDesktop.IconLocation = $icon }; " ^
    "$scDesktop.Save(); " ^
    "$scStartup = $wsh.CreateShortcut((Join-Path $startup 'SkylineSurveyTray.lnk')); " ^
    "$scStartup.TargetPath = 'wscript.exe'; " ^
    "$scStartup.Arguments = '\"\"\"%~dp0SkylineTray.vbs\"\"\"'; " ^
    "$scStartup.WorkingDirectory = '%~dp0'; " ^
    "$scStartup.Description = 'Skyline Survey System Tray'; " ^
    "if (Test-Path $icon) { $scStartup.IconLocation = $icon }; " ^
    "$scStartup.Save();"

echo [OK] Da tao Shortcut tren man hinh Desktop!
echo [OK] Da thiet lap tu dong khoi dong cung Windows!
echo.
echo Dang khoi chay Tien ich khay he thong ngay bay gio...
wscript.exe "%~dp0SkylineTray.vbs"

echo.
echo ================================================================
echo   HOAN TAT! Hay nhin xuong goc phai man hinh (canh dong ho)
echo   de thay bieu tuong Skyline Survey.
echo ================================================================
echo.
pause

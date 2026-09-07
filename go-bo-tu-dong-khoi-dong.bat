@echo off
title Go bo Skyline Survey khoi Startup Windows
cd /d "%~dp0"

echo ================================================================
echo   GO BO SKYLINE SURVEY KHOI STARTUP WINDOWS
echo ================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startup = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup); $file = Join-Path $startup 'SkylineSurvey.lnk'; if (Test-Path $file) { Remove-Item -Path $file -Force }"

echo Da go bo khoi danh sach tu dong khoi dong cung Windows!
echo.
pause

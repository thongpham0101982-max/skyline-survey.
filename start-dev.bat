@echo off
title SQMS Development Server
cd /d "%~dp0"

echo ====================================================
echo   SQMS - DEV SERVER (PORT 3000)
echo   Dang chay tai dia chi: http://192.168.10.239:3000
echo ====================================================
set NODE_OPTIONS=--max-old-space-size=8192

node node_modules\next\dist\bin\next dev -H 0.0.0.0 -p 3000
pause

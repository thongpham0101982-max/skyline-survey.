@echo off
title Skyline Portal 24/7 Service
cd /d d:\SSM\skyline-survey
echo Dang khoi chay Skyline Portal bang PM2...
call pm2 start ecosystem.config.js
call pm2 save
echo.
echo ========================================================
echo   Skyline Portal da duoc khoi chay thanh cong tren PM2!
echo   Dia chi truy cap: http://192.168.10.239:3000
echo ========================================================
echo.
pm2 status
pause

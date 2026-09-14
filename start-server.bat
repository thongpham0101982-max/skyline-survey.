@echo off
title Skyline Portal 24/7 (PM2 Service)
cd /d d:\SSM\skyline-survey

echo ====================================================
echo   SKYLINE SURVEY SYSTEM - PM2 24/7 (PORT 3000)
echo   Dia chi truy cap: http://192.168.10.239:3000
echo ====================================================

call pm2 start ecosystem.config.js
call pm2 save
exit /b 0

@echo off
title Discord Bot ^& Dashboard - Running
cls
echo ====================================================
echo   Starting Discord Bot ^& Dark Dashboard
echo ====================================================
set PATH=%LOCALAPPDATA%\Programs\node-v20.18.0-win-x64;%PATH%
node index.js
pause

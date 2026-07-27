@echo off
title PitchLab Full Stack Launcher
echo Starting PitchLab Web Server on Port 8082...
start "PitchLab Static Web Server" /D "%~dp0frontend" node server.js

echo Starting Firebase Emulators...
set NODE_TLS_REJECT_UNAUTHORIZED=0
cd /d "%~dp0"
firebase emulators:start
pause

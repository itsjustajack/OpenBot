@echo off
title Stop OpenBot
cd /d "%~dp0"
"%ProgramFiles%\Git\bin\bash.exe" -c "bash scripts/stop.sh"
pause

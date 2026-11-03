@echo off
title Start OpenBot
cd /d "%~dp0"
docker info >nul 2>&1 || start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
"%ProgramFiles%\Git\bin\bash.exe" -c "bash scripts/start.sh" && start "" http://localhost:3010
pause

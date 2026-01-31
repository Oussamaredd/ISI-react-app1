@echo off
chcp 65001 >nul
echo Stopping React App 1 services...
docker compose --profile core down

echo.
echo Cleaning up Docker resources...
docker system prune -f

echo.
echo Services stopped and cleaned up
echo.
echo To restart: start-dev.bat
pause
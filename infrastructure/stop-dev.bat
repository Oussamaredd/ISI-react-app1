@echo off
chcp 65001 >nul
echo Stopping React App 1 services...
docker compose --profile core down --remove-orphans

echo.
echo Services stopped.
echo.
echo To remove DB volume too: docker compose --profile core down -v
echo.
pause

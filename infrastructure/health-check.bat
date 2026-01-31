@echo off
chcp 65001 >nul
echo React App 1 - Service Health Check
echo.

echo Checking running containers...
docker compose ps

echo.
echo Checking service health...
echo Testing frontend...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo Frontend - HEALTHY
) else (
    echo Frontend - UNHEALTHY
)

echo Testing backend...
curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Backend - HEALTHY
) else (
    echo Backend - UNHEALTHY
)

echo Testing database connection...
docker compose exec -T db pg_isready -U postgres -d ticketdb >nul 2>&1
if %errorlevel% equ 0 (
    echo Database - HEALTHY
) else (
    echo Database - UNHEALTHY
)

echo.
echo For detailed logs: docker compose logs -f
echo.
pause
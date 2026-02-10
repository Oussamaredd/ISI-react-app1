@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
echo React App 1 - Service Health Check
echo.

echo Checking running containers...
docker compose ps

echo.
echo Testing migration step...
set MIGRATE_STATUS=
set MIGRATE_EXIT=
for /f %%s in ('docker inspect -f "{{.State.Status}}" ticket_migrate 2^>nul') do set MIGRATE_STATUS=%%s
for /f %%e in ('docker inspect -f "{{.State.ExitCode}}" ticket_migrate 2^>nul') do set MIGRATE_EXIT=%%e
if /I "!MIGRATE_STATUS!"=="exited" if "!MIGRATE_EXIT!"=="0" (
    echo Migration - HEALTHY
) else (
    echo Migration - UNHEALTHY
)

echo.
echo Testing frontend...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo Frontend - HEALTHY
) else (
    echo Frontend - UNHEALTHY
)

echo Testing backend...
curl -s http://localhost:3001/api/health >nul 2>&1
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

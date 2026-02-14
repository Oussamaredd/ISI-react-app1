@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.yml"
set "CANONICAL_ENV=%SCRIPT_DIR%environments\.env.docker"

echo EcoTrack - Service Health Check
echo.

echo Checking running containers...
docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" ps

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
docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" exec -T db pg_isready -U postgres -d ticketdb >nul 2>&1
if %errorlevel% equ 0 (
    echo Database - HEALTHY
) else (
    echo Database - UNHEALTHY
)

echo.
echo For detailed logs: docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" logs -f
echo.
pause

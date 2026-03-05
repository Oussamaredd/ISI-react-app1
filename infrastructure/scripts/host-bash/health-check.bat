@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "INFRA_DIR=%%~fI"
set "COMPOSE_FILE=%INFRA_DIR%\docker-compose.yml"
set "CANONICAL_ENV=%INFRA_DIR%\environments\.env.docker"
set "HAS_FAILURE=0"
set "DOCKER_READY=0"

echo EcoTrack - Service Health Check
echo.

echo Checking running containers...
docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" ps
if !errorlevel! equ 0 (
    set "DOCKER_READY=1"
) else (
    echo Docker Compose - UNHEALTHY
    set "HAS_FAILURE=1"
)

echo.
echo Testing frontend UI...
curl -fsS http://localhost:3000 >nul 2>&1
if !errorlevel! equ 0 (
    echo Frontend UI - HEALTHY
) else (
    echo Frontend UI - UNHEALTHY
    set "HAS_FAILURE=1"
)

echo Testing frontend edge readiness...
curl -fsS http://localhost:3000/api/health/ready >nul 2>&1
if !errorlevel! equ 0 (
    echo Frontend edge readiness - HEALTHY
) else (
    echo Frontend edge readiness - UNHEALTHY
    set "HAS_FAILURE=1"
)

echo Testing backend host port closure...
curl -sS --connect-timeout 2 http://localhost:3001/health >nul 2>&1
if !errorlevel! neq 0 (
    echo Backend host port - HEALTHY, closed to the host
) else (
    echo Backend host port - UNHEALTHY, exposed to the host
    set "HAS_FAILURE=1"
)

echo Testing backend internal liveness...
if "!DOCKER_READY!"=="1" (
    docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" exec -T backend curl -fsS http://localhost:3001/health >nul 2>&1
    if !errorlevel! equ 0 (
        echo Backend internal liveness - HEALTHY
    ) else (
        echo Backend internal liveness - UNHEALTHY
        set "HAS_FAILURE=1"
    )
) else (
    echo Backend internal liveness - UNHEALTHY
    set "HAS_FAILURE=1"
)

echo Testing backend internal readiness...
if "!DOCKER_READY!"=="1" (
    docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" exec -T backend curl -fsS http://localhost:3001/api/health/ready >nul 2>&1
    if !errorlevel! equ 0 (
        echo Backend internal readiness - HEALTHY
    ) else (
        echo Backend internal readiness - UNHEALTHY
        set "HAS_FAILURE=1"
    )
) else (
    echo Backend internal readiness - UNHEALTHY
    set "HAS_FAILURE=1"
)

echo Testing database connection...
if "!DOCKER_READY!"=="1" (
    docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" exec -T db pg_isready -U postgres -d ticketdb >nul 2>&1
    if !errorlevel! equ 0 (
        echo Database - HEALTHY
    ) else (
        echo Database - UNHEALTHY
        set "HAS_FAILURE=1"
    )
) else (
    echo Database - UNHEALTHY
    set "HAS_FAILURE=1"
)

echo.
echo For detailed logs: docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" logs -f
echo.
if "!HAS_FAILURE!"=="1" (
    exit /b 1
)

exit /b 0

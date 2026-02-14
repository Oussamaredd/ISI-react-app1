@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.yml"
set "CANONICAL_ENV=%SCRIPT_DIR%environments\.env.docker"
set "LEGACY_ENV=%SCRIPT_DIR%..\.env.docker"
set "ROOT_ENV_EXAMPLE=%SCRIPT_DIR%..\.env.example"

echo Starting EcoTrack development environment...
echo.

echo Step 1: Setting up canonical Docker environment...
if exist "%CANONICAL_ENV%" (
    echo Canonical Docker env already exists: infrastructure\environments\.env.docker
) else (
    if exist "%LEGACY_ENV%" (
        echo Migrating legacy root .env.docker to infrastructure\environments\.env.docker...
        copy "%LEGACY_ENV%" "%CANONICAL_ENV%" >nul
        echo Canonical Docker env created from legacy file
    ) else (
        if not exist "%ROOT_ENV_EXAMPLE%" (
            echo Missing template file: %ROOT_ENV_EXAMPLE%
            goto :error
        )
        echo Creating canonical Docker env from .env.example...
        copy "%ROOT_ENV_EXAMPLE%" "%CANONICAL_ENV%" >nul
        echo Canonical Docker env created successfully
    )
)

echo.
echo Step 2: Building and starting core services (db, migrate, backend, frontend)...
docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" --profile core up --build -d
if errorlevel 1 goto :error

echo.
echo Step 3: Waiting for migration job completion...
set MIGRATE_STATUS=
set MIGRATE_EXIT=
for /L %%i in (1,1,60) do (
    for /f %%s in ('docker inspect -f "{{.State.Status}}" ticket_migrate 2^>nul') do set MIGRATE_STATUS=%%s
    if /I "!MIGRATE_STATUS!"=="exited" (
        for /f %%e in ('docker inspect -f "{{.State.ExitCode}}" ticket_migrate 2^>nul') do set MIGRATE_EXIT=%%e
        goto :migration_done
    )
    timeout /t 2 >nul
)

:migration_done
if not "!MIGRATE_EXIT!"=="0" (
    echo Migration job failed or did not complete in time.
    docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" logs migrate
    goto :error
)

echo.
echo Step 4: Service status
docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" ps

echo.
echo Service URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001/api
echo.
echo To view logs: docker compose -f infrastructure/docker-compose.yml logs -f
echo.
echo To stop services: docker compose -f infrastructure/docker-compose.yml --profile core down --remove-orphans
echo.
pause
exit /b 0

:error
echo Failed to start development environment.
exit /b 1

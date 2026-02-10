@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

echo Starting React App 1 Development Environment...
echo.

echo Step 1: Setting up environment...
if not exist ..\.env.docker (
    echo Creating root .env.docker from .env.example...
    copy ..\.env.example ..\.env.docker >nul
    echo Root .env.docker created successfully
) else (
    echo Root .env.docker already exists
)

echo.
echo Step 2: Building and starting core services (db, migrate, backend, frontend)...
docker compose --profile core up --build -d
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
    docker compose logs migrate
    goto :error
)

echo.
echo Step 4: Service status
docker compose ps

echo.
echo Service URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001/api
echo.
echo To view logs: docker compose logs -f
echo.
echo To stop services: docker compose --profile core down --remove-orphans
echo.
pause
exit /b 0

:error
echo Failed to start development environment.
exit /b 1

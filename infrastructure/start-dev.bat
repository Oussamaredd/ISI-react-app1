@echo off
chcp 65001 >nul
echo Starting React App 1 Development Environment...
echo.

echo Step 1: Setting up environment...
if not exist .env.docker (
    echo Creating environment file from template...
    copy environments\.env.docker .env.docker
    echo Environment file created successfully
) else (
    echo Environment file already exists
)

echo.
echo Step 2: Starting Docker services...
echo Starting database, backend, and frontend...
docker compose --profile core up --build

echo.
echo Checking service status...
timeout /t 10 docker compose ps

echo.
echo Service URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo To view logs: docker compose logs -f
echo.
echo To stop services: docker compose --profile core down
echo.
echo To restart: docker-compose-restart.bat
pause
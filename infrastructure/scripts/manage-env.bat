@echo off
setlocal EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "INFRA_DIR=%SCRIPT_DIR%.."
set "ENV_DIR=%INFRA_DIR%\environments"
set "DOCKER_ENV=%ENV_DIR%\.env.docker"
set "DOCKER_TEMPLATE=%ENV_DIR%\.env.docker.example"

:show_help
if "%~1"=="" goto :print_help
if /I "%~1"=="help" goto :print_help
if /I "%~1"=="--help" goto :print_help
if /I "%~1"=="-h" goto :print_help
goto :dispatch

:print_help
echo Environment management (canonical infrastructure env files)
echo.
echo Usage: %~n0 ^<command^>
echo.
echo Commands:
echo   init-docker   Create infrastructure\environments\.env.docker from template if missing
echo   status        Show canonical environment file status
echo   help          Show this help
exit /b 0

:dispatch
if /I "%~1"=="init-docker" goto :init_docker
if /I "%~1"=="status" goto :status
echo Unknown command: %~1
exit /b 1

:init_docker
if exist "%DOCKER_ENV%" (
  echo [INFO] infrastructure\environments\.env.docker already exists
  exit /b 0
)

if not exist "%DOCKER_TEMPLATE%" (
  echo [ERROR] Missing template: infrastructure\environments\.env.docker.example
  exit /b 1
)

copy "%DOCKER_TEMPLATE%" "%DOCKER_ENV%" >nul
echo [INFO] Created infrastructure\environments\.env.docker from template
echo [WARNING] Update CHANGE_ME_* values before running containers
exit /b 0

:status
echo [INFO] Canonical environment files:
for %%f in (".env.docker" ".env.docker.example" ".env.development.example" ".env.staging.example" ".env.production.example") do (
  if exist "%ENV_DIR%\%%~f" (
    echo   [OK] infrastructure\environments\%%~f
  ) else (
    echo   [MISSING] infrastructure\environments\%%~f
  )
)
exit /b 0

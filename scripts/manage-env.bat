@echo off
REM Environment Variable Management Script for Windows
REM Usage: manage-env.bat [command] [options]

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

REM Colors for output (limited in Windows CMD)
set "INFO=[INFO]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM Print colored output
:print_info
echo %INFO% %~1
goto :eof

:print_warning
echo %WARNING% %~1
goto :eof

:print_error
echo %ERROR% %~1
goto :eof

REM Check if required tools are installed
:check_dependencies
where openssl >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "OpenSSL is required but not installed. Please install OpenSSL."
    exit /b 1
)
goto :eof

REM Generate secure random string
:generate_secret
set length=%~1
if "%length%"=="" set length=32
for /f "delims=" %%i in ('openssl rand -hex %length%') do set secret=%%i
goto :eof

REM Initialize environment for development
:init_dev
call :print_info "Initializing development environment..."

set env_file=%PROJECT_DIR%\.env.development

if exist "%env_file%" (
    call :print_warning "Development environment file already exists"
    set /p overwrite="Do you want to overwrite it? (y/N): "
    if /i not "!overwrite!"=="y" goto :eof
)

REM Generate secrets
call :generate_secret
set session_secret=!secret!
call :generate_secret
set jwt_secret=!secret!

REM Copy template and replace secrets
copy "%PROJECT_DIR%\.env.example" "%env_file%" >nul
powershell -Command "(Get-Content '%env_file%') -replace 'your-32-character-session-secret-minimum', '%session_secret%' | Set-Content '%env_file%'"
powershell -Command "(Get-Content '%env_file%') -replace 'your-32-character-jwt-secret-minimum', '%jwt_secret%' | Set-Content '%env_file%'"

call :print_info "Development environment initialized"
call :print_warning "Please update the following variables in %env_file%:"
call :print_warning "  - GOOGLE_CLIENT_ID"
call :print_warning "  - GOOGLE_CLIENT_SECRET"
call :print_warning "  - DATABASE_URL"
goto :eof

REM Initialize environment for production
:init_prod
call :print_info "Initializing production environment..."

set env_file=%PROJECT_DIR%\.env.production

if exist "%env_file%" (
    call :print_error "Production environment file already exists. Refusing to overwrite."
    exit /b 1
)

REM Generate stronger secrets for production
call :generate_secret 64
set session_secret=!secret!
call :generate_secret 64
set jwt_secret=!secret!

REM Copy template and replace secrets
copy "%PROJECT_DIR%\.env.example" "%env_file%" >nul
powershell -Command "(Get-Content '%env_file%') -replace 'your-32-character-session-secret-minimum', '%session_secret%' | Set-Content '%env_file%'"
powershell -Command "(Get-Content '%env_file%') -replace 'your-32-character-jwt-secret-minimum', '%jwt_secret%' | Set-Content '%env_file%'"

REM Update production-specific settings
powershell -Command "(Get-Content '%env_file%') -replace 'SESSION_SECURE=false', 'SESSION_SECURE=true' | Set-Content '%env_file%'"
powershell -Command "(Get-Content '%env_file%') -replace 'NODE_ENV=development', 'NODE_ENV=production' | Set-Content '%env_file%'"
powershell -Command "(Get-Content '%env_file%') -replace 'ENABLE_SEED_DATA=true', 'ENABLE_SEED_DATA=false' | Set-Content '%env_file%'"
powershell -Command "(Get-Content '%env_file%') -replace 'ENABLE_SWAGGER=true', 'ENABLE_SWAGGER=false' | Set-Content '%env_file%'"

call :print_info "Production environment initialized"
call :print_warning "Please update the following variables in %env_file%:"
call :print_warning "  - GOOGLE_CLIENT_ID (production credentials)"
call :print_warning "  - GOOGLE_CLIENT_SECRET (production credentials)"
call :print_warning "  - DATABASE_URL (production database)"
call :print_warning "  - REDIS_URL (production Redis)"
call :print_warning "  - APP_URL (production URL)"
call :print_warning "  - SMTP_* (email configuration)"
goto :eof

REM Show environment status
:show_status
call :print_info "Environment Status:"
echo.

set env_files=.env.development .env.staging .env.production .env.local

for %%f in (%env_files%) do (
    set full_path=%PROJECT_DIR%\%%f
    if exist "!full_path!" (
        echo   [✓] %%f - EXISTS
    ) else (
        echo   [✗] %%f - MISSING
    )
)

echo.
call :print_info "Docker Compose Files:"
set compose_files=docker-compose.yml docker-compose.staging.yml docker-compose.production.yml

for %%f in (%compose_files%) do (
    set full_path=%PROJECT_DIR%\%%f
    if exist "!full_path!" (
        echo   [✓] %%f
    ) else (
        echo   [✗] %%f
    )
)
goto :eof

REM Show help
:show_help
echo Environment Variable Management Script
echo.
echo Usage: %0 [command] [options]
echo.
echo Commands:
echo     init-dev           Initialize development environment
echo     init-prod          Initialize production environment
echo     status             Show environment status
echo     help               Show this help message
echo.
echo Examples:
echo     %0 init-dev
echo     %0 init-prod
echo     %0 status
echo.
echo Environment files are located in the project root:
echo     - .env.development
echo     - .env.staging
echo     - .env.production
echo     - .env.local
echo.
goto :eof

REM Main script logic
:main
call :check_dependencies

if "%~1"=="" goto show_help
if "%~1"=="help" goto show_help
if "%~1"=="--help" goto show_help
if "%~1"=="-h" goto show_help

if "%~1"=="init-dev" (
    call :init_dev
) else if "%~1"=="init-prod" (
    call :init_prod
) else if "%~1"=="status" (
    call :show_status
) else (
    call :print_error "Unknown command: %~1"
    call :show_help
    exit /b 1
)

goto :eof

REM Run main function
call :main %*
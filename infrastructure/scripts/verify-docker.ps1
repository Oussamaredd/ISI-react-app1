# Docker verification script (PowerShell)
# Validates compose config using the canonical Docker env source.

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')
$composeFile = Join-Path $repoRoot 'infrastructure\docker-compose.yml'
$envFile = Join-Path $repoRoot 'infrastructure\environments\.env.docker'
$composeArgs = @('--env-file', $envFile, '-f', $composeFile)

Write-Host 'Docker verification tests' -ForegroundColor Cyan
Write-Host '=========================' -ForegroundColor Cyan

# Test 1: base compose config
Write-Host '1) Validating compose config...' -ForegroundColor Yellow
$null = docker compose @composeArgs config
Write-Host 'OK: compose config is valid' -ForegroundColor Green

# Test 2: profile configs
Write-Host ''
Write-Host '2) Validating profiles...' -ForegroundColor Yellow
foreach ($profile in @('core', 'obs', 'quality')) {
  $null = docker compose @composeArgs --profile $profile config
  Write-Host "OK: profile '$profile' is valid" -ForegroundColor Green
}

# Test 3: required services
Write-Host ''
Write-Host '3) Checking service definitions...' -ForegroundColor Yellow
$fullConfig = docker compose @composeArgs --profile core --profile obs --profile quality config
$services = @('db', 'migrate', 'backend', 'frontend', 'elasticsearch', 'logstash', 'kibana', 'prometheus', 'grafana')
foreach ($service in $services) {
  if ($fullConfig -match "(?m)^\s*$service:") {
    Write-Host "OK: service '$service' is defined" -ForegroundColor Green
  } else {
    Write-Host "FAIL: service '$service' not found" -ForegroundColor Red
    exit 1
  }
}

# Test 4: network
Write-Host ''
Write-Host '4) Checking network configuration...' -ForegroundColor Yellow
if ($fullConfig -match 'ticket-management-network') {
  Write-Host 'OK: ticket-management-network is defined' -ForegroundColor Green
} else {
  Write-Host 'FAIL: ticket-management-network not found' -ForegroundColor Red
  exit 1
}

# Test 5: volumes
Write-Host ''
Write-Host '5) Checking volumes...' -ForegroundColor Yellow
foreach ($volume in @('db_data', 'es_data', 'prometheus-data', 'grafana-storage')) {
  if ($fullConfig -match "(?m)^\s*$volume:") {
    Write-Host "OK: volume '$volume' is defined" -ForegroundColor Green
  } else {
    Write-Host "WARN: volume '$volume' not found" -ForegroundColor Yellow
  }
}

# Test 6: key env variables rendered
Write-Host ''
Write-Host '6) Checking rendered env variables...' -ForegroundColor Yellow
foreach ($needle in @('DATABASE_URL=', 'POSTGRES_USER=', 'POSTGRES_DB=')) {
  if ($fullConfig -match [regex]::Escape($needle)) {
    Write-Host "OK: found '$needle' in rendered config" -ForegroundColor Green
  } else {
    Write-Host "FAIL: missing '$needle' in rendered config" -ForegroundColor Red
    exit 1
  }
}

Write-Host ''
Write-Host 'All Docker verification checks passed.' -ForegroundColor Green
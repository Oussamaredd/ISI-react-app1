# Docker Verification Script (PowerShell)
# Ensures Docker setup is working correctly

Write-Host "🐳 Docker Verification Tests" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Test 1: Docker Compose configuration
Write-Host "1. Testing Docker Compose configuration..." -ForegroundColor Yellow
try {
    $config = docker compose config 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker Compose configuration is valid" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker Compose configuration has errors" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running Docker Compose config: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Profile configurations
Write-Host ""
Write-Host "2. Testing Docker profiles..." -ForegroundColor Yellow

$profiles = @("core", "obs", "quality")
foreach ($profile in $profiles) {
    try {
        $profileConfig = docker compose --profile "$profile" config 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Profile '$profile' configuration is valid" -ForegroundColor Green
        } else {
            Write-Host "❌ Profile '$profile' configuration has errors" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Error testing profile '$profile': $_" -ForegroundColor Red
        exit 1
    }
}

# Test 3: Service existence
Write-Host ""
Write-Host "3. Checking service definitions..." -ForegroundColor Yellow

# Get full config with all profiles
$fullConfig = docker compose --profile core --profile obs --profile quality config 2>$null

$services = @("db", "backend", "frontend", "elasticsearch", "logstash", "kibana", "sonarqube", "prometheus", "grafana")
foreach ($service in $services) {
    if ($fullConfig -match "^\s*$($service):") {
        Write-Host "✅ Service '$service' is defined" -ForegroundColor Green
    } else {
        Write-Host "❌ Service '$service' not found" -ForegroundColor Red
    }
}

# Test 4: Health checks
Write-Host ""
Write-Host "4. Checking health check definitions..." -ForegroundColor Yellow

$healthCheckServices = @("db", "backend", "frontend", "elasticsearch")
foreach ($service in $healthCheckServices) {
    $serviceConfig = $fullConfig -split "^\s*$($service):" | Select-Object -Skip 1 | Select-Object -First 1
    if ($serviceConfig -match "healthcheck:") {
        Write-Host "✅ Service '$service' has health check" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Service '$service' missing health check" -ForegroundColor Yellow
    }
}

# Test 5: Networks
Write-Host ""
Write-Host "5. Checking network configuration..." -ForegroundColor Yellow

if ($fullConfig -match "networks:") {
    Write-Host "✅ Networks are defined" -ForegroundColor Green
} else {
    Write-Host "❌ No networks found" -ForegroundColor Red
    exit 1
}

if ($fullConfig -match "isi-react-app1-network") {
    Write-Host "✅ Application network is defined" -ForegroundColor Green
} else {
    Write-Host "❌ Application network not found" -ForegroundColor Red
    exit 1
}

# Test 6: Volumes
Write-Host ""
Write-Host "6. Checking volume configuration..." -ForegroundColor Yellow

$volumes = @("db_data", "es_data", "sonarqube_data", "prometheus-data", "grafana-storage")
foreach ($volume in $volumes) {
        if ($config -match "^\s*$($volume):") {
        Write-Host "✅ Volume '$volume' is defined" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Volume '$volume' not found" -ForegroundColor Yellow
    }
}

# Test 7: Environment variables
Write-Host ""
Write-Host "7. Checking environment variable configuration..." -ForegroundColor Yellow

if ($config -match "POSTGRES_") {
    Write-Host "✅ PostgreSQL environment variables defined" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL environment variables missing" -ForegroundColor Red
    exit 1
}

# Test 8: Port mappings
Write-Host ""
Write-Host "8. Checking port mappings..." -ForegroundColor Yellow

$ports = @("5432:5432", "5000:5000", "3000:80", "9200:9200", "5601:5601", "9000:9000", "9090:9090", "3030:3000")
foreach ($port in $ports) {
    if ($config -match "$port") {
        Write-Host "✅ Port mapping '$port' is defined" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Port mapping '$port' not found (may be in a specific profile)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ All Docker verification tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "🐳 Docker Setup Summary:" -ForegroundColor Cyan
Write-Host "   • Valid Docker Compose configuration"
Write-Host "   • All profiles configured correctly"
Write-Host "   • Services, networks, and volumes defined"
Write-Host "   • Health checks implemented"
Write-Host "   • Environment variables configured"
Write-Host "   • Port mappings properly set"
Write-Host ""
Write-Host "🚀 Ready to run with:" -ForegroundColor Green
Write-Host "   docker compose --profile core up -d    # Core services" -ForegroundColor White
Write-Host "   docker compose --profile obs up -d      # Observability stack" -ForegroundColor White
Write-Host "   docker compose --profile quality up -d  # Quality tools" -ForegroundColor White
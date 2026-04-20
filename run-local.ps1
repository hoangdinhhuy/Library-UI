$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDir = Join-Path $repoRoot 'Tiki_Project\api'
$webDir = Join-Path $repoRoot 'Tiki_Project\website'

if (-not (Test-Path $apiDir)) {
    Write-Error "API folder not found: $apiDir"
}

Write-Host 'Starting backend at http://localhost:8000 ...' -ForegroundColor Cyan
$backendCmd = @(
    "Set-Location '$apiDir'",
    "if (Test-Path '.\\venv\\Scripts\\Activate.ps1') { . '.\\venv\\Scripts\\Activate.ps1' }",
    "python main.py"
) -join '; '
Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $backendCmd

Write-Host 'Starting frontend at http://localhost:5500 ...' -ForegroundColor Cyan
$frontendCmd = @(
    "Set-Location '$webDir'",
    "python -m http.server 5500"
) -join '; '
Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $frontendCmd

Write-Host 'Opening browser...' -ForegroundColor Green
Start-Process 'http://localhost:5500'

Write-Host ''
Write-Host 'If API still fails, verify:' -ForegroundColor Yellow
Write-Host '1) GEMINI_API_KEY is configured in Tiki_Project/api/.env'
Write-Host '2) Port 8000 is free'
Write-Host '3) Backend terminal has no startup errors'

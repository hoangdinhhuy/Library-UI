$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDir = Join-Path $repoRoot 'Tiki_Project\api'
$webDir = Join-Path $repoRoot 'Tiki_Project\website'

function Stop-PortProcesses {
    param(
        [int[]]$Ports
    )

    foreach ($port in $Ports) {
        $portPattern = ":$port"
        $netstatLines = netstat -ano -p tcp | Select-String -Pattern $portPattern | Select-String -Pattern "LISTENING"
        $targets = @()

        foreach ($line in $netstatLines) {
            $parts = ($line.Line -split '\s+') | Where-Object { $_ -ne '' }
            if ($parts.Length -ge 5) {
                $targets += $parts[-1]
            }
        }

        $targets = $targets | Select-Object -Unique
        foreach ($target in $targets) {
            try {
                $proc = Get-Process -Id $target -ErrorAction Stop
                Stop-Process -Id $target -Force -ErrorAction Stop
                Write-Host "Stopped existing process on port ${port}: PID $target ($($proc.ProcessName))" -ForegroundColor Yellow
            }
            catch {
                Write-Host "Failed to stop PID $target on port ${port}: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

if (-not (Test-Path $apiDir)) {
    Write-Error "API folder not found: $apiDir"
}

if (-not (Test-Path $webDir)) {
    Write-Error "Website folder not found: $webDir"
}

Write-Host 'Cleaning old processes on ports 8000 and 5501 ...' -ForegroundColor Cyan
Stop-PortProcesses -Ports @(8000, 5501)

Write-Host 'Starting backend at http://localhost:8000 ...' -ForegroundColor Cyan
$backendCmd = @(
    "Set-Location '$apiDir'",
    "if (Test-Path '.\\venv\\Scripts\\Activate.ps1') { . '.\\venv\\Scripts\\Activate.ps1' } elseif (Test-Path '.\\venv311\\Scripts\\Activate.ps1') { . '.\\venv311\\Scripts\\Activate.ps1' }",
    "python main.py"
) -join '; '
Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $backendCmd

Write-Host 'Starting frontend at http://localhost:5501 ...' -ForegroundColor Cyan
$frontendCmd = @(
    "Set-Location '$webDir'",
    "python -m http.server 5501"
) -join '; '
Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $frontendCmd

Write-Host 'Opening browser...' -ForegroundColor Green
Start-Process 'http://localhost:5501'

Write-Host ''
Write-Host 'If API still fails, verify:' -ForegroundColor Yellow
Write-Host '1) GEMINI_API_KEY is configured in Tiki_Project/api/.env'
Write-Host '2) Port 8000 is free'
Write-Host '3) Backend terminal has no startup errors'
Write-Host '4) Frontend terminal has no startup errors'

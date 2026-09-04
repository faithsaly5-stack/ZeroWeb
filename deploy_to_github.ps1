# ==============================================================================
#  ZEROWEB — 1-CLICK GITHUB DEPLOYER (POWERSHELL)
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Clear-Host
Write-Host ""
Write-Host " ==============================================================================" -ForegroundColor Cyan
Write-Host "   ZEROWEB — 1-CLICK GITHUB DEPLOYER & SYNCHRONIZER" -ForegroundColor White
Write-Host " ==============================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Git is not installed on this system." -ForegroundColor Red
    Start-Process "https://git-scm.com/downloads"
    Read-Host "Press Enter to exit..."
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Node.js is not installed on this system." -ForegroundColor Red
    Start-Process "https://nodejs.org/"
    Read-Host "Press Enter to exit..."
    exit 1
}

node scripts/github_deployer.js

Read-Host "Press Enter to exit..."

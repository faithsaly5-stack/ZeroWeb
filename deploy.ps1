# ==============================================================================
#  ZEROWEB — CLOUDFLARE 1-CLICK POWERSHELL DEPLOYER
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Clear-Host
Write-Host ""
Write-Host " ==============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   ZEROWEB — 1-CLICK CLOUDFLARE DEPLOYER" -ForegroundColor White
Write-Host "   Zero-Cost Hosting · Telegram CMS · 100% .env Customizable" -ForegroundColor Gray
Write-Host ""
Write-Host " ==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "[*] Checking environment dependencies..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host " [!] Node.js روی سیستم شما یافت نشد / Node.js was not detected." -ForegroundColor Red
    Write-Host "     در حال بررسی نصب خودکار از طریق winget..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host " [*] Installing Node.js LTS via winget..." -ForegroundColor Cyan
        & winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        Write-Host " [✓] Node.js نصب شد! لطفاً پنجره را ببندید و مجدداً deploy.ps1 را اجرا کنید." -ForegroundColor Green
        Read-Host "Press Enter to exit..."
        exit 0
    }
    Write-Host " [*] Opening https://nodejs.org/ in your browser..." -ForegroundColor Cyan
    Start-Process "https://nodejs.org/"
    Write-Host "     لطفاً نسخه LTS را نصب کرده و مجدداً اسکریپت را اجرا کنید." -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}
Write-Host "    [✓] Node.js is ready." -ForegroundColor Green

# 2. Check .env
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host ""
        Write-Host "[*] Creating your personal configuration (.env)..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "    [✓] Created .env file successfully with ready-to-use defaults!" -ForegroundColor Green
    }
}

# 3. Check Wrangler & Dependencies
if (-not (Test-Path "node_modules\wrangler")) {
    Write-Host ""
    Write-Host "[*] [1-Time Setup] Installing Cloudflare Wrangler & dependencies..." -ForegroundColor Yellow
    Write-Host "                  در حال دانلود و آماده‌سازی خودکار ابزارها..." -ForegroundColor Cyan
    npm install --no-audit --no-fund
    Write-Host "    [✓] Dependencies installed." -ForegroundColor Green
}

# 4. Execute 1-Click Automated Deployment Runner
node scripts/deploy_runner.js

Read-Host "Press Enter to exit..."

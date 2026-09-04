@echo off
setlocal EnableExtensions
title Cloudflare 1-Click Deployer

cls
echo.
echo ==============================================================================
echo   BUILD YOUR OWN WEBSITE FOR FREE -- 1-CLICK CLOUDFLARE DEPLOYER
echo ==============================================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto NoNode

goto RunDeploy

:NoNode
where winget >nul 2>&1
if errorlevel 1 goto OpenNodeWeb
echo [!] Node.js was not found on this computer.
echo [*] Installing Node.js LTS automatically via Windows Package Manager...
winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
echo.
echo [OK] Node.js installed! Please close this window and double-click deploy.bat again.
echo.
pause
exit /b 0

:OpenNodeWeb
echo [!] Node.js was not detected on this computer.
echo [*] Opening https://nodejs.org/ in your browser...
start https://nodejs.org/
echo.
echo [*] Please install Node.js and double-click deploy.bat again.
echo.
pause
exit /b 1

:RunDeploy
node scripts/deploy_runner.js
if errorlevel 1 goto Failed

echo.
echo Press any key to exit...
pause >nul
exit /b 0

:Failed
echo.
echo ==============================================================================
echo [!] Deployment process stopped. Please review the output above.
echo ==============================================================================
echo.
pause
exit /b 1

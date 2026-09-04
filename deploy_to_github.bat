@echo off
setlocal EnableExtensions
title ZeroWeb GitHub 1-Click Deployer

cls
echo.
echo ==============================================================================
echo   ZEROWEB -- 1-CLICK GITHUB DEPLOYER ^& SYNCHRONIZER
echo ==============================================================================
echo.

where git >nul 2>&1
if errorlevel 1 goto NoGit

where node >nul 2>&1
if errorlevel 1 goto NoNode

goto RunDeploy

:NoGit
echo [!] Git was not detected on this computer.
echo [*] Opening https://git-scm.com/ in your browser...
start https://git-scm.com/downloads
echo [*] Please install Git and double-click deploy_to_github.bat again.
echo.
pause
exit /b 1

:NoNode
echo [!] Node.js was not detected on this computer.
echo [*] Opening https://nodejs.org/ in your browser...
start https://nodejs.org/
echo [*] Please install Node.js and double-click deploy_to_github.bat again.
echo.
pause
exit /b 1

:RunDeploy
node scripts/github_deployer.js
if errorlevel 1 goto Failed

echo.
echo Press any key to exit...
pause >nul
exit /b 0

:Failed
echo.
echo ==============================================================================
echo [!] GitHub deployment stopped. Please review messages above.
echo ==============================================================================
echo.
pause
exit /b 1

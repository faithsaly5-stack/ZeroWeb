@echo off
setlocal EnableDelayedExpansion

echo ===================================================
echo   Telegram Bot ^& Webhook Diagnostic Tool
echo ===================================================
echo.

:: Read BOT_TOKEN from .env if available
set BOT_TOKEN=
if exist ".env" (
    for /f "tokens=1,2 delims==" %%A in (.env) do (
        if "%%A"=="BOT_TOKEN" set BOT_TOKEN=%%B
    )
)

:: Strip surrounding quotes
if defined BOT_TOKEN (
    set BOT_TOKEN=!BOT_TOKEN:"=!
)

if "%BOT_TOKEN%"=="" (
    set /p BOT_TOKEN="Enter your Telegram Bot Token: "
) else (
    echo [*] Using BOT_TOKEN from .env
)
echo.

echo 1. Checking Bot Profile (getMe)...
curl -s "https://api.telegram.org/bot%BOT_TOKEN%/getMe"
echo.
echo.

echo 2. Checking Telegram Webhook Info (getWebhookInfo)...
curl -s "https://api.telegram.org/bot%BOT_TOKEN%/getWebhookInfo"
echo.
echo.

echo ===================================================
echo Diagnostic finished!
echo ===================================================
pause

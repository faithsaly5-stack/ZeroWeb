@echo off
setlocal EnableDelayedExpansion

echo ===================================================
echo   Telegram Webhook Setup Tool
echo ===================================================
echo.

node scripts/sync_secrets.js
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [✓] Webhook setup completed using .env settings!
    echo.
    pause
    exit /b 0
)

echo.
set /p DOMAIN="Enter your domain (e.g. yoursite.pages.dev): "
set /p BOT_TOKEN="Enter your Telegram Bot Token: "
echo.
echo Optional but recommended: a secret token proves calls really come from
echo Telegram. Use ONLY letters/numbers/underscore/dash (1-256 chars).
set /p SECRET="Secret token (optional, leave empty to skip): "

echo.
echo Setting webhook to https://%DOMAIN%/api/telegram-webhook ...
echo.

if "%SECRET%"=="" (
  curl -X POST "https://api.telegram.org/bot%BOT_TOKEN%/setWebhook" -H "Content-Type: application/json" -d "{\"url\": \"https://%DOMAIN%/api/telegram-webhook\"}"
) else (
  curl -X POST "https://api.telegram.org/bot%BOT_TOKEN%/setWebhook" -H "Content-Type: application/json" -d "{\"url\": \"https://%DOMAIN%/api/telegram-webhook\", \"secret_token\": \"%SECRET%\"}"
)

echo.
echo ===================================================
echo Check output above for "ok": true.
echo ===================================================
pause

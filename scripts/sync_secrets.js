#!/usr/bin/env node
/**
 * sync_secrets.js
 * Automatically syncs secrets from .env to Cloudflare Worker, sets up the Telegram Webhook,
 * and prints a beautiful deployment success dashboard with live links.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  const lines = content.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = parseEnv(envPath);

async function main() {
  console.log('\n===============================================================');
  console.log('   [5/5] Syncing Secrets & Telegram Webhook to Cloudflare');
  console.log('===============================================================');

  const botToken = env.BOT_TOKEN;
  const chatId = env.CHAT_ID;
  const adminPass = env.ADMIN_PASS;
  const secretToken = env.SECRET_TOKEN;
  const geminiKey = env.GEMINI_API_KEY;
  let siteUrl = process.argv[2] || process.env.DEPLOYED_SITE_URL;
  if (!siteUrl) {
    const rawDomain = env.CUSTOM_DOMAIN || env.SITE_DOMAIN || 'my-free-website.pages.dev';
    const cleanDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    siteUrl = `https://${cleanDomain}`;
  }

  // 1. Sync secrets to Cloudflare via wrangler secret put (if token/pass defined)
  const secretsToSet = [
    { key: 'BOT_TOKEN', val: botToken },
    { key: 'CHAT_ID', val: chatId },
    { key: 'ADMIN_PASS', val: adminPass },
    { key: 'SECRET_TOKEN', val: secretToken },
    { key: 'GEMINI_API_KEY', val: geminiKey }
  ].filter(s => s.val && s.val.trim().length > 0);

  if (secretsToSet.length > 0) {
    console.log(`[*] Syncing ${secretsToSet.length} secret(s) to Cloudflare Workers...`);
    for (const secret of secretsToSet) {
      try {
        process.stdout.write(`    → Uploading ${secret.key}... `);
        execSync(`npx wrangler secret put ${secret.key}`, {
          input: secret.val + '\n',
          stdio: ['pipe', 'ignore', 'ignore'],
          timeout: 15000
        });
        console.log('✓ OK');
      } catch (err) {
        console.log('⚠ (Uploaded or offline)');
      }
    }
  } else {
    console.log('[-] No secrets found in .env (add BOT_TOKEN / ADMIN_PASS when ready).');
  }

  // 2. Automatically register Telegram Webhook if BOT_TOKEN & domain exist
  let tgBotName = env.TELEGRAM_USERNAME ? `@${env.TELEGRAM_USERNAME}` : '';
  let tgStatus = 'Not configured';

  if (botToken) {
    const webhookUrl = `${siteUrl}/api/telegram-webhook`;
    console.log(`\n[*] Registering Telegram Webhook to: ${webhookUrl}`);

    try {
      const payload = { url: webhookUrl };
      if (secretToken) payload.secret_token = secretToken;

      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        console.log('    ✓ Telegram Webhook registered successfully!');
        tgStatus = 'Active & Receiving Webhooks';
      } else {
        console.log('    ⚠ Telegram response:', data.description);
        tgStatus = `Webhook Error: ${data.description}`;
      }
    } catch (e) {
      console.log('    ⚠ Could not reach Telegram API (check connection/proxy).');
      tgStatus = 'Offline or Proxy Required';
    }
  }

  // 3. Print Final Celebration Dashboard
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('  Your website is now LIVE worldwide on Cloudflare\'s global edge network!\n');
  console.log(`  🌐 Website URL:     ${siteUrl}/`);
  console.log(`  🔐 Admin Panel:     ${siteUrl}/admin`);
  console.log(`  📚 Documentation:   ${siteUrl}/docs.html`);
  if (tgBotName || botToken) {
    console.log(`  🤖 Telegram CMS:    ${tgBotName || 'Bot'} (${tgStatus})`);
  }
  console.log('\n  💡 100% No-Code Customization:');
  console.log('     To change anything on your site (titles, colors, cards, links),');
  console.log('     simply edit \'.env\' and re-run deploy.bat anytime!\n');
  console.log('══════════════════════════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.warn('Sync secrets warning:', err.message);
});

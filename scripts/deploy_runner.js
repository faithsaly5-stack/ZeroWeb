#!/usr/bin/env node
/**
 * scripts/deploy_runner.js
 * 
 * Turnkey 1-Click Automated Cloudflare Deployer.
 * Engineered for complete beginners:
 * 1. Checks Cloudflare Authentication (opens browser for 1-click authorization if needed)
 * 2. Compiles and minifies assets, sitemaps, and site-config
 * 3. Deploys to Cloudflare Workers / Pages
 * 4. Captures the real, live Cloudflare URL
 * 5. Syncs secrets and configures Telegram Webhook to the real URL
 * 6. Displays a prominent success card with live links
 * 7. Automatically launches the live website in the user's default browser
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envFile = path.join(rootDir, '.env');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (let line of content.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    let key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function openBrowser(url) {
  try {
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
    exec(`${start} "${url}"`);
  } catch (e) { }
}

function runSpawn(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: rootDir,
      shell: true,
      stdio: opts.inherit ? 'inherit' : ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: 'false',
        NODE_OPTIONS: '--dns-result-order=ipv4first',
        ...opts.env
      }
    });

    let stdout = '';
    let stderr = '';

    if (!opts.inherit) {
      if (child.stdout) {
        child.stdout.on('data', (d) => {
          const s = d.toString();
          stdout += s;
          process.stdout.write(s);
        });
      }
      if (child.stderr) {
        child.stderr.on('data', (d) => {
          const s = d.toString();
          stderr += s;
          process.stderr.write(s);
        });
      }
    }

    child.on('close', (code) => {
      resolve({ code: code || 0, stdout, stderr });
    });

    child.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: err.message });
    });
  });
}

async function main() {
  console.log('\n==============================================================================');
  console.log('  🚀 BUILD YOUR OWN WEBSITE FOR FREE — ONE-CLICK CLOUDFLARE DEPLOY');
  console.log('==============================================================================\n');

  // 0. Auto-initialize .env if missing
  if (!fs.existsSync(envFile)) {
    const exampleFile = path.join(rootDir, '.env.example');
    if (fs.existsSync(exampleFile)) {
      fs.copyFileSync(exampleFile, envFile);
      console.log('    [✓] Created .env configuration file from template.\n');
    }
  }
  const env = parseEnv(envFile);

  // 0.1 Check & auto-install dependencies if missing
  const wranglerDir = path.join(rootDir, 'node_modules', 'wrangler');
  if (!fs.existsSync(wranglerDir)) {
    console.log('[*] Installing Cloudflare Wrangler and project dependencies (first-time only)...');
    console.log('    در حال نصب خودکار ابزارها و وابستگی‌ها...\n');
    let installRes = await runSpawn('npm install --no-audit --no-fund', [], { inherit: true });
    if (installRes.code !== 0) {
      console.warn('    [!] Warning during npm install, attempting to continue...');
    } else {
      console.log('    [✓] Dependencies ready.\n');
    }
  }

  // 1. Check Cloudflare login status
  console.log('[*] [1/4] Checking Cloudflare login status...');
  let checkAuth = await runSpawn('npx --yes wrangler whoami', [], { inherit: false });

  if (checkAuth.code !== 0) {
    const authOut = (checkAuth.stdout || '') + ' ' + (checkAuth.stderr || '');
    if (authOut.includes('timed out') || authOut.includes('ETIMEDOUT') || authOut.includes('FetchError')) {
      console.log('\n⚠️ هشدار شبکه: اتصال مستقیم به سرورهای کلودفلر با تاخیر مواجه شد.');
      console.log('   در صورت لزوم، فیلترشکن (VPN) خود را فعال نمایید.');
      console.log('   Cloudflare API timed out. Please enable your VPN / proxy if required.\n');
    }

    console.log('------------------------------------------------------------------------------');
    console.log('  🔑 ورود به حساب کلودفلر (تنها برای اولین بار)');
    console.log('     Cloudflare Authorization Required (First-time only)');
    console.log('------------------------------------------------------------------------------');
    console.log('  مرورگر شما برای تأیید اتصال به اکانت کلودفلر باز می‌شود.');
    console.log('  تنها کافیست روی دکمه "Allow" در صفحه باز شده کلیک کنید.');
    console.log('  Your browser is opening. Simply click "Allow" on the Cloudflare auth page.\n');

    let loginRes = await runSpawn('npx --yes wrangler login', [], { inherit: true });
    if (loginRes.code !== 0) {
      console.error('\n[!] ورود انجام نشد / Authentication was cancelled or failed.');
      console.error('    لطفاً مجدداً deploy.bat را اجرا کنید.\n');
      process.exit(1);
    }
  }
  console.log('    [✓] Cloudflare account verified successfully.\n');

  // 2. Compile and minify project assets
  console.log('[*] [2/4] Compiling site configuration, documents & optimizing assets...');
  let buildRes = await runSpawn('npm run predeploy', [], { inherit: true });
  if (buildRes.code !== 0) {
    console.error('\n[!] خطا در ساخت فایل‌ها. لطفاً فرمت فایل .env را بررسی کنید.');
    process.exit(1);
  }
  console.log('    [✓] All assets compiled and validated.\n');

  // 3. Deploy to Cloudflare
  console.log('[*] [3/4] Uploading & Deploying to Cloudflare global network...');
  console.log('    (Please wait a few seconds while Cloudflare provisions your website)\n');

  let deployRes = await runSpawn('npx --yes wrangler deploy', [], { inherit: false });
  const deployOutput = (deployRes.stdout || '') + '\n' + (deployRes.stderr || '');

  if (deployRes.code !== 0) {
    console.error('\n==============================================================================');
    console.error('  [!] DEPLOYMENT NOTICE / راهنمای رفع مشکل ارتباط شبکه');
    console.error('==============================================================================');
    if (deployOutput.includes('timed out') || deployOutput.includes('ETIMEDOUT') || deployOutput.includes('FetchError')) {
      console.error('  اتصال اینترنت شما برای دسترسی به سرورهای کلودفلر با محدودیت مواجه شد.');
      console.error('  راهکار: لطفاً فیلترشکن (VPN) یا پروکسی سیستم خود را روشن کرده و');
      console.error('  مجدداً روی deploy.bat کلیک کنید.');
      console.error('\n  Connection to Cloudflare timed out. Please enable your VPN / proxy and retry.');
    } else {
      console.error('  Wrangler encountered an error during deployment:');
      console.error(deployOutput.slice(-500));
    }
    console.error('==============================================================================\n');
    process.exit(1);
  }

  // 4. Detect actual deployed live URL from output
  let liveUrl = null;
  const urlMatches = deployOutput.match(/https:\/\/[a-zA-Z0-9_\-\.]+\.(?:workers\.dev|pages\.dev)/g);
  if (urlMatches && urlMatches.length > 0) {
    liveUrl = urlMatches[urlMatches.length - 1].trim();
  }

  // Fallback to configured domain if regex didn't catch a workers.dev URL
  if (!liveUrl) {
    const rawDomain = env.CUSTOM_DOMAIN || env.SITE_DOMAIN;
    if (rawDomain && !rawDomain.includes('my-free-website.pages.dev') && !rawDomain.includes('example.com')) {
      liveUrl = `https://${rawDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
    }
  }



  // 5. Sync secrets & Telegram webhook using the real live URL
  console.log('\n[*] [4/4] Syncing secrets and configuring Telegram CMS...');
  await runSpawn(`node scripts/sync_secrets.js ${liveUrl || ''}`, [], { inherit: true });

  const finalSiteUrl = liveUrl || `https://${(env.CUSTOM_DOMAIN || env.SITE_DOMAIN || 'my-site.workers.dev').replace(/^https?:\/\//, '')}`;

  // 6. Print Grand Celebration Card with the Real Live Link
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                                ║');
  console.log('║                   🎉  وب‌سایت شما با موفقیت منتشر شد!  🎉                      ║');
  console.log('║               YOUR WEBSITE IS NOW LIVE GLOBALLY ON CLOUDFLARE!                 ║');
  console.log('║                                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  🌐 آدرس سایت زنده شما (Live Website Link):');
  console.log(`     👉  \x1b[36m\x1b[1m${finalSiteUrl}/\x1b[0m`);
  console.log('');
  console.log('  📚 پایگاه دانش و مستندات (Docs & Knowledge Base):');
  console.log(`     👉  \x1b[36m${finalSiteUrl}/docs.html\x1b[0m`);
  console.log('');
  console.log('  🔐 پنل مدیریت ربات تلگرام (Telegram CMS & Admin):');
  console.log(`     👉  \x1b[36m${finalSiteUrl}/admin\x1b[0m`);
  console.log('');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log('  ✨ در حال باز کردن وب‌سایت در مرورگر شما...');
  console.log('  Opening your live website in your default browser now...');
  console.log('────────────────────────────────────────────────────────────────────────────────\n');

  // Automatically open the website in the user's browser!
  openBrowser(`${finalSiteUrl}/`);
}

main().catch((err) => {
  console.error('[!] Unexpected error in deploy runner:', err.message);
  process.exit(1);
});

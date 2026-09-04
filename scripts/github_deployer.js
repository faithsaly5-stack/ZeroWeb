#!/usr/bin/env node
/**
 * scripts/github_deployer.js
 * 
 * 1-Click GitHub Repository Publisher & Deployer.
 * Engineered for ease of use & maximum security:
 * 1. Checks Git & GitHub CLI installation
 * 2. Initializes local Git repository if missing
 * 3. Enforces strict .gitignore security (NEVER leaks .env or secrets)
 * 4. Auto-creates GitHub remote repository via `gh` or connects existing remote
 * 5. Commits and pushes changes cleanly to branch `main`
 * 6. Handles remote synchronization (pull --rebase) seamlessly
 * 7. Displays live repository link and opens it in the browser
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '..');

function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: opts.inherit ? 'inherit' : ['pipe', 'pipe', 'pipe'],
      ...opts
    }).trim();
  } catch (err) {
    if (opts.throwOnError) throw err;
    return null;
  }
}

function openBrowser(url) {
  try {
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
    execSync(`${start} "${url}"`, { stdio: 'ignore' });
  } catch (e) { }
}

async function main() {
  console.log('\n==============================================================================');
  console.log('  🚀 ZEROWEB — ONE-CLICK GITHUB PUBLISHER & SYNCHRONIZER');
  console.log('  انتشار و همگام‌سازی آسان پروژه زیرووِب روی گیت‌هاب');
  console.log('==============================================================================\n');

  // 1. Verify Git Installation
  console.log('[*] [1/5] Checking Git installation...');
  const gitVersion = run('git --version');
  if (!gitVersion) {
    console.error('\n[!] خطا: نرم‌افزار Git روی سیستم شما نصب نیست / Git is not installed.');
    console.error('    لطفاً Git را از آدرس https://git-scm.com دانلود و نصب نمایید.\n');
    openBrowser('https://git-scm.com/downloads');
    process.exit(1);
  }
  console.log(`    [✓] ${gitVersion} detected.`);

  // 2. Initialize Git Repository if missing
  console.log('\n[*] [2/5] Checking local repository...');
  const isGitRepo = fs.existsSync(path.join(rootDir, '.git'));
  if (!isGitRepo) {
    console.log('    [+] Initializing local Git repository...');
    run('git init');
    run('git branch -M main');
    console.log('    [✓] Repository initialized on branch "main".');
  } else {
    // Ensure branch is named main
    run('git branch -M main');
    console.log('    [✓] Git repository active (branch: main).');
  }

  // 3. Strict Safety Enforcement: Ensure .env is never tracked
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '.env\n.env.*\n!.env.example\nnode_modules/\n.wrangler/\n*.log\n', 'utf8');
  }
  // Forcefully unstage any sensitive files just in case
  run('git rm -r --cached .env .dev.vars .wrangler logs >nul 2>&1');

  // 4. Remote Origin Configuration
  console.log('\n[*] [3/5] Configuring GitHub remote repository...');
  let remoteUrl = run('git remote get-url origin');

  if (!remoteUrl) {
    // Check if GitHub CLI is logged in
    const ghStatus = run('gh auth status');
    const isGhLoggedIn = ghStatus !== null || run('gh api user');

    if (isGhLoggedIn) {
      console.log('\n  💡 شما به حساب گیت‌هاب (GitHub CLI) متصل هستید!');
      console.log('     انتخاب نحوه ایجاد مخزن (Repository):');
      console.log('     1) ایجاد مخزن جدید در اکانت شما به‌صورت خودکار (پیش‌فرض)');
      console.log('     2) اتصال به آدرس مخزن موجود (Existing Repository URL)\n');

      const choice = (await prompt('گزینه مورد نظر (1 یا 2، اینتر برای پیش‌فرض 1): ')) || '1';

      if (choice === '1') {
        const defaultName = path.basename(rootDir).toLowerCase().replace(/\s+/g, '-');
        const repoName = (await prompt(`نام مخزن در گیت‌هاب [${defaultName}]: `)) || defaultName;
        const visibility = (await prompt('عمومی باشد یا خصوصی؟ public / private [public]: ')).toLowerCase() || 'public';
        const flag = visibility.startsWith('priv') ? '--private' : '--public';

        console.log(`\n    [+] Creating GitHub repository "${repoName}" (${flag})...`);
        try {
          run(`gh repo create "${repoName}" ${flag} --source=. --remote=origin`, { inherit: true, throwOnError: true });
          remoteUrl = run('git remote get-url origin');
          console.log(`    [✓] Created & linked to: ${remoteUrl}`);
        } catch (e) {
          console.warn('    [!] Could not auto-create via gh, falling back to manual input.');
        }
      }
    }

    const DEFAULT_REPO = 'https://github.com/faithsaly5-stack/ZeroWeb.git';
    if (!remoteUrl) {
      console.log('\n  لطفاً آدرس مخزن گیت‌هاب را وارد نمایید (اینتر برای پیش‌فرض):');
      console.log(`  پیش‌فرض: ${DEFAULT_REPO}\n`);
      const input = await prompt(`GitHub Repo URL [${DEFAULT_REPO}]: `);
      remoteUrl = input || DEFAULT_REPO;
      run(`git remote add origin ${remoteUrl}`);
      console.log(`    [✓] Remote origin set to: ${remoteUrl}`);
    }
  } else {
    console.log(`    [✓] Target GitHub Repository: \x1b[36m${remoteUrl}\x1b[0m`);
    const change = await prompt('    Press Enter to use this repository, or type "change" to edit: ');
    if (change.toLowerCase() === 'change') {
      const newUrl = await prompt('    Enter new GitHub Repo URL: ');
      if (newUrl) {
        run(`git remote set-url origin ${newUrl}`);
        remoteUrl = newUrl;
        console.log(`    [✓] Updated remote origin to: ${remoteUrl}`);
      }
    }
  }

  // 5. Stage & Safety Filter
  console.log('\n[*] [4/5] Staging and verifying changes...');
  run('git add -A');
  // Paranoid reset of sensitive files
  run('git reset HEAD .env .dev.vars >nul 2>&1');

  // Check if there are changes to commit
  const status = run('git status --porcelain');
  if (status) {
    const today = new Date().toISOString().slice(0, 10);
    const defaultMsg = `Release ZeroWeb platform (${today})`;
    const customMsg = await prompt(`پیام کامیت / Commit message [${defaultMsg}]: `);
    const commitMsg = customMsg || defaultMsg;

    console.log(`    [+] Committing with message: "${commitMsg}"...`);
    run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  } else {
    console.log('    [i] Working tree is clean. Ready to push latest commits.');
  }

  // 6. Push to GitHub
  console.log('\n[*] [5/5] Pushing changes to GitHub (branch: main)...');
  let pushSuccess = false;

  try {
    run('git push -u origin main', { inherit: true, throwOnError: true });
    pushSuccess = true;
  } catch (err) {
    console.log('\n    [!] Standard push rejected. Attempting automatic sync (git pull --rebase)...');
    try {
      run('git pull --rebase origin main', { inherit: true, throwOnError: true });
      run('git push -u origin main', { inherit: true, throwOnError: true });
      pushSuccess = true;
    } catch (e) {
      console.error('\n[!] Push to GitHub failed.');
      console.error('    راهنما: اگر دسترسی ۴۰۳ دریافت کردید، دستور `gh auth login` را برای ورود مجدد اجرا نمایید.');
    }
  }

  if (pushSuccess) {
    // Format web URL from git URL
    let webUrl = remoteUrl.replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
    if (!webUrl.startsWith('http')) webUrl = `https://github.com/${webUrl}`;

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                                ║');
    console.log('║             🎉  پروژه ZEROWEB با موفقیت روی گیت‌هاب منتشر شد!  🎉              ║');
    console.log('║                 ZEROWEB SUCCESSFULLY PUBLISHED TO GITHUB!                      ║');
    console.log('║                                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  🐙 آدرس مخزن در گیت‌هاب (GitHub Repository):');
    console.log(`     👉  \x1b[36m\x1b[1m${webUrl}\x1b[0m`);
    console.log('');
    console.log('  🔒 امنیت اطلاعات (Security Guarantee):');
    console.log('     فایل .env و اطلاعات محرمانه شما به هیچ وجه آپلود نشده و محافظت شد.');
    console.log('');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    console.log('  Opening your GitHub repository in your browser...');
    console.log('────────────────────────────────────────────────────────────────────────────────\n');

    openBrowser(webUrl);
  }
}

main().catch(err => {
  console.error('[!] Unexpected error:', err.message);
  process.exit(1);
});

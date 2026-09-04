const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

// 1. Ensure .env exists
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('[*] .env file not found. Initializing from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
}

// 2. Robust .env parser
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

// Helper: Hex to RGB string for CSS glassmorphism
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return '59, 130, 246';
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return '59, 130, 246';
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

const accentColor = env.ACCENT_COLOR || '#3b82f6';
const accentRgb = hexToRgb(accentColor);
const accentHover = env.ACCENT_COLOR_HOVER || '#60a5fa';

// 3. Assemble complete configuration dictionary
const config = {
  // ۱. Site Branding & Identity
  SITE_NAME: env.SITE_NAME || 'وبسایت رایگان خود را بسازید',
  SITE_TITLE: env.SITE_TITLE || 'وبسایت رایگان خود را بسازید | کلودفلر و مدیریت تلگرامی',
  SITE_SUBTITLE: env.SITE_SUBTITLE || 'پلتفرم رایگان، فوق‌سریع و مدرن با کنترل پنل تلگرام و هاست ابری',
  SITE_DESCRIPTION: env.SITE_DESCRIPTION || 'قالب آماده، پرسرعت و کاملاً رایگان برای ساخت وب‌سایت شخصی و شرکتی روی کلودفلر (Cloudflare Pages) با سیستم مدیریت محتوای تلگرام و پایگاه دانش آنلاین.',
  SITE_AUTHOR: env.SITE_AUTHOR || 'مدیر سایت',
  SITE_KEYWORDS: env.SITE_KEYWORDS || 'ساخت سایت رایگان, کلودفلر پیجز, ربات تلگرام cms, وبلاگ نویسی, پورتفولیو, هاست رایگان, طراحی سایت',
  SITE_DOMAIN: env.SITE_DOMAIN || 'my-free-website.pages.dev',
  SITE_LANG: env.SITE_LANG || 'fa',
  SITE_DIR: env.SITE_DIR || 'rtl',
  DEFAULT_THEME: env.DEFAULT_THEME || 'dark',
  ACCENT_COLOR: accentColor,
  ACCENT_COLOR_RGB: accentRgb,
  ACCENT_COLOR_HOVER: accentHover,
  BRAND_LOGO_TEXT: env.BRAND_LOGO_TEXT || 'سایت من',
  BRAND_LOGO_SUBTITLE: env.BRAND_LOGO_SUBTITLE || 'میزبانی ابری کلودفلر',

  // ۲. Navigation & Header Links
  NAV_LINK_ABOUT: env.NAV_LINK_ABOUT || 'ویژگی‌ها',
  NAV_LINK_PORTFOLIO: env.NAV_LINK_PORTFOLIO || 'پلتفرم‌ها',
  NAV_LINK_SERVICES: env.NAV_LINK_SERVICES || 'امکانات',
  NAV_LINK_DOCS: env.NAV_LINK_DOCS || 'مستندات',
  NAV_LINK_TOOLS: env.NAV_LINK_TOOLS || 'ابزارها',
  NAV_LINK_POSTS: env.NAV_LINK_POSTS || 'یادداشت‌ها',
  NAV_LINK_QA: env.NAV_LINK_QA || 'پرسش و پاسخ',
  NAV_CTA_TEXT: env.NAV_CTA_TEXT || 'شروع رایگان',
  NAV_CTA_URL: env.NAV_CTA_URL || '#order',

  // ۳. Hero Section
  HERO_BADGE: env.HERO_BADGE || '⚡ میزبانی ۱۰۰٪ رایگان &nbsp;·&nbsp; کلودفلر &nbsp;·&nbsp; سیستم مدیریت تلگرام',
  HERO_TITLE: env.HERO_TITLE || 'ساخت و راه‌اندازی رایگان وب‌سایت',
  HERO_SUBTITLE: env.HERO_SUBTITLE || 'کلودفلر و سیستم مدیریت تلگرام',
  HERO_LEAD: env.HERO_LEAD || 'وب‌سایت شخصی و حرفه‌ای خود را به‌صورت کاملاً رایگان روی زیرساخت پرسرعت Cloudflare پیاده‌سازی کنید و تمام محتوا، نظرات و فایل‌ها را مستقیماً از تلگرام مدیریت نمایید.',
  HERO_TAGLINE: env.HERO_TAGLINE || 'شبکه جهانی لبه ابری · هزینه ماهانه صفر · تنظیم کامل از طریق فایل .env',
  HERO_CTA_PRIMARY_TEXT: env.HERO_CTA_PRIMARY_TEXT || 'شروع و ارتباط',
  HERO_CTA_PRIMARY_URL: env.HERO_CTA_PRIMARY_URL || '#order',
  HERO_CTA_SECONDARY_TEXT: env.HERO_CTA_SECONDARY_TEXT || 'مشاهده مستندات',
  HERO_CTA_SECONDARY_URL: env.HERO_CTA_SECONDARY_URL || '/docs.html',

  // ۴. Interactive Focus Highlights
  HERO_FOCUS_1_BTN: env.HERO_FOCUS_1_BTN || '☁️ هاست ابری رایگان',
  HERO_FOCUS_1_TITLE: env.HERO_FOCUS_1_TITLE || '☁️ میزبانی پرسرعت روی شبکه لبه جهانی کلودفلر',
  HERO_FOCUS_1_DESC: env.HERO_FOCUS_1_DESC || 'استقرار با یک کلیک از طریق deploy.bat. بهره‌مندی از ۱۰۰ هزار درخواست رایگان روزانه، گواهی امنیتی SSL خودکار، فایروال ضد DDoS و اتصال دامنه اختصاصی.',
  HERO_FOCUS_2_BTN: env.HERO_FOCUS_2_BTN || '🤖 مدیریت تلگرام',
  HERO_FOCUS_2_TITLE: env.HERO_FOCUS_2_TITLE || '🤖 کنترل پنل و مدیریت کامل محتوا از تلگرام',
  HERO_FOCUS_2_DESC: env.HERO_FOCUS_2_DESC || 'دریافت پیام‌های بازدیدکنندگان، انتشار مقالات و مستندات، ویرایش مطالب و مشاهده آمار تلمتری به‌صورت زنده و مستقیم از تلفن همراه.',
  HERO_FOCUS_3_BTN: env.HERO_FOCUS_3_BTN || '🛠 شخصی‌سازی با .env',
  HERO_FOCUS_3_TITLE: env.HERO_FOCUS_3_TITLE || '🛠 ۱۰۰٪ شخصی‌سازی بدون کدنویسی از طریق .env',
  HERO_FOCUS_3_DESC: env.HERO_FOCUS_3_DESC || 'تغییر تمام عنوان‌ها، رنگ‌ها، متن‌های هیرو، شمارنده‌های آماری، کارت‌های پلتفرم و اطلاعات ارتباطی فقط با ویرایش یک فایل .env.',

  // ۵. Stats Counters
  SHOW_STATS: env.SHOW_STATS !== 'false',
  STAT_1_NUM: env.STAT_1_NUM || '۰ تومان',
  STAT_1_LABEL: env.STAT_1_LABEL || 'هزینه هاست و سرور (۱۰۰٪ دائمی رایگان)',
  STAT_1_ICON: env.STAT_1_ICON || '💰',
  STAT_2_NUM: env.STAT_2_NUM || '۵۰ms',
  STAT_2_LABEL: env.STAT_2_LABEL || 'میانگین پاسخ‌دهی CDN لبه جهانی',
  STAT_2_ICON: env.STAT_2_ICON || '⚡',
  STAT_3_NUM: env.STAT_3_NUM || '۲۴/۷',
  STAT_3_LABEL: env.STAT_3_LABEL || 'سیستم مدیریت محتوا و اعلان تلگرام',
  STAT_3_ICON: env.STAT_3_ICON || '🤖',

  // ۶. About Section
  SHOW_ABOUT: env.SHOW_ABOUT !== 'false',
  ABOUT_EYEBROW: env.ABOUT_EYEBROW || 'ویژگی‌های برجسته',
  ABOUT_TITLE: env.ABOUT_TITLE || 'چرا این قالب بهترین انتخاب برای شماست؟',
  ABOUT_DESCRIPTION: env.ABOUT_DESCRIPTION || 'راهکاری جامع و آماده که به شما امکان می‌دهد وب‌سایتی پیشرفته، مدرن و باکلاس را بدون پرداخت هیچ هزینه‌ای و با مدیریت مستقیم تلگرام بالا بیاورید.',
  ABOUT_CARD_1_ICON: env.ABOUT_CARD_1_ICON || '☁️',
  ABOUT_CARD_1_TITLE: env.ABOUT_CARD_1_TITLE || 'زیرساخت جهانی کلودفلر',
  ABOUT_CARD_1_DESC: env.ABOUT_CARD_1_DESC || 'اجرای سریع و بدون اختلال بر روی Cloudflare Pages و Workers در بیش از ۳۰۰ شهر دنیا با پایداری ۹۹.۹۹٪.',
  ABOUT_CARD_1_BADGE: env.ABOUT_CARD_1_BADGE || 'امن و کاملاً رایگان',
  ABOUT_CARD_2_ICON: env.ABOUT_CARD_2_ICON || '🤖',
  ABOUT_CARD_2_TITLE: env.ABOUT_CARD_2_TITLE || 'سیستم مدیریت محتوای تلگرامی',
  ABOUT_CARD_2_DESC: env.ABOUT_CARD_2_DESC || 'ارسال مستندات، پاسخ به سوالات مخاطبان و مدیریت تمامی بخش‌های سایت در لحظه و از محیط تلگرام.',
  ABOUT_CARD_2_BADGE: env.ABOUT_CARD_2_BADGE || 'مدیریت بدون لپ‌تاپ',
  ABOUT_CARD_3_ICON: env.ABOUT_CARD_3_ICON || '⚙️',
  ABOUT_CARD_3_TITLE: env.ABOUT_CARD_3_TITLE || 'شخصی‌سازی همه‌چیز در .env',
  ABOUT_CARD_3_DESC: env.ABOUT_CARD_3_DESC || 'تمامی نوشته‌ها، رنگ سازمانی، شمارنده‌ها و لینک‌های شبکه‌های اجتماعی از یک فایل تنظیم می‌شوند.',
  ABOUT_CARD_3_BADGE: env.ABOUT_CARD_3_BADGE || 'بدون نیاز به کدنویسی',

  // ۷. Portfolio / Bento Grid
  SHOW_PORTFOLIO: env.SHOW_PORTFOLIO !== 'false',
  BENTO_EYEBROW: env.BENTO_EYEBROW || 'پلتفرم‌های آماده',
  BENTO_TITLE: env.BENTO_TITLE || 'سیستم‌های داخلی آماده بهره‌برداری',
  BENTO_DESCRIPTION: env.BENTO_DESCRIPTION || 'این قالب شامل ماژول‌های قدرتمند و کاربردی است که بلافاصله پس از استقرار در دسترس شما قرار می‌گیرند.',
  BENTO_1_TITLE: env.BENTO_1_TITLE || 'هاست لبه ابری با تاخیر نزدیک به صفر',
  BENTO_1_DESC: env.BENTO_1_DESC || 'تحویل فوق‌سریع منابع با پروتکل HTTP/3، فشرده‌سازی خودکار Brotli و گواهی SSL رایگان.',
  BENTO_1_BADGE: env.BENTO_1_BADGE || '🌍 شبکه ابری جهانی',
  BENTO_1_LINK: env.BENTO_1_LINK || '#process',
  BENTO_2_TITLE: env.BENTO_2_TITLE || 'پایگاه دانش، مستندات و وبلاگ',
  BENTO_2_DESC: env.BENTO_2_DESC || 'سیستم انتشار مقالات فنی با جستجوی درلحظه کلاینت، برچسب‌گذاری هوشمند و بارگذاری سریع.',
  BENTO_2_BADGE: env.BENTO_2_BADGE || '📖 پایگاه دانش',
  BENTO_2_LINK: env.BENTO_2_LINK || '/docs.html',
  BENTO_3_TITLE: env.BENTO_3_TITLE || 'آمار و تلمتری درلحظه سیستم',
  BENTO_3_DESC: env.BENTO_3_DESC || 'مشاهده وضعیت سلامت سرور، تعداد درخواست‌ها و وضعیت اتصال به هوش مصنوعی و تلگرام.',
  BENTO_3_BADGE: env.BENTO_3_BADGE || '⚡ تلمتری آنلاین',
  BENTO_3_LINK: env.BENTO_3_LINK || '#about',
  BENTO_4_TITLE: env.BENTO_4_TITLE || 'هاب ربات و وب‌هوک هوشمند تلگرام',
  BENTO_4_DESC: env.BENTO_4_DESC || 'سیستم پیام‌رسانی دوطرفه با بازدیدکنندگان، دریافت فرم‌ها و مدیریت مقالات از گوشی هوشمند.',
  BENTO_4_BADGE: env.BENTO_4_BADGE || '🤖 پنل تلگرام',
  BENTO_4_LINK: env.BENTO_4_LINK || '#order',

  // ۸. Services Grid
  SHOW_SERVICES: env.SHOW_SERVICES !== 'false',
  SERVICES_EYEBROW: env.SERVICES_EYEBROW || 'امکانات و ماژول‌ها',
  SERVICES_TITLE: env.SERVICES_TITLE || 'هر آنچه برای یک وب‌سایت کامل نیاز دارید',
  SERVICES_DESCRIPTION: env.SERVICES_DESCRIPTION || 'ماژول‌های پیش‌تنظیم‌شده با هماهنگی کامل بین سرویس‌های کلودفلر و تلگرام.',
  SERVICE_1_ICON: env.SERVICE_1_ICON || '☁️',
  SERVICE_1_TITLE: env.SERVICE_1_TITLE || 'هاست رایگان کلودفلر پیجز',
  SERVICE_1_DESC: env.SERVICE_1_DESC || 'پایداری بالا، گواهی SSL نامحدود و میزبانی رایگان با ۱۰۰ هزار درخواست در روز.',
  SERVICE_2_ICON: env.SERVICE_2_ICON || '🤖',
  SERVICE_2_TITLE: env.SERVICE_2_TITLE || 'ربات مدیریت محتوای تلگرام',
  SERVICE_2_DESC: env.SERVICE_2_DESC || 'دریافت پیام‌ها و پاسخ به مخاطبان به همراه ارسال فایل و مستندات مستقیم از چت.',
  SERVICE_3_ICON: env.SERVICE_3_ICON || '🔒',
  SERVICE_3_TITLE: env.SERVICE_3_TITLE || 'داشبورد ادمین تحت وب /admin',
  SERVICE_3_DESC: env.SERVICE_3_DESC || 'پنل مدیریت محافظت‌شده با رمز عبور برای پایش پیام‌ها، وضعیت سیستم و دانلودها.',
  SERVICE_4_ICON: env.SERVICE_4_ICON || '⚡',
  SERVICE_4_TITLE: env.SERVICE_4_TITLE || 'سئو و سرعت بهینه‌سازی شده',
  SERVICE_4_DESC: env.SERVICE_4_DESC || 'معماری سرورلس با امتیاز بالای ۱۰۰ در لایت‌هاوس، نقشه سایت خودکار و کش لبه ابری.',
  SERVICE_5_ICON: env.SERVICE_5_ICON || '📚',
  SERVICE_5_TITLE: env.SERVICE_5_TITLE || 'سیستم وبلاگ و پایگاه دانش',
  SERVICE_5_DESC: env.SERVICE_5_DESC || 'دسته‌بندی خودکار مقالات، فیلتر آنی بدون رفرش و فرمت‌بندی خوانا با فونت وزیرمتن.',
  SERVICE_6_ICON: env.SERVICE_6_ICON || '🎨',
  SERVICE_6_TITLE: env.SERVICE_6_TITLE || 'طراحی مدرن شیشه‌ای و تم تاریک/روشن',
  SERVICE_6_DESC: env.SERVICE_6_DESC || 'رابط کاربری چشم‌نواز با تم تیره و روشن، انیمیشن ذرات و سازگاری کامل با جهت راست‌به‌چپ (RTL).',

  // ۹. Process Steps
  SHOW_PROCESS: env.SHOW_PROCESS !== 'false',
  PROCESS_EYEBROW: env.PROCESS_EYEBROW || 'راهنمای راه‌اندازی',
  PROCESS_TITLE: env.PROCESS_TITLE || 'راه‌اندازی سایت شما در ۴ مرحله ساده',
  STEP_1_NUM: env.STEP_1_NUM || '۱',
  STEP_1_TITLE: env.STEP_1_TITLE || 'تنظیم فایل .env',
  STEP_1_DESC: env.STEP_1_DESC || 'فایل .env را باز کرده و عنوان سایت، رنگ مورد نظر، توکن ربات تلگرام و لینک‌ها را وارد کنید.',
  STEP_2_NUM: env.STEP_2_NUM || '۲',
  STEP_2_TITLE: env.STEP_2_TITLE || 'اجرای deploy.bat',
  STEP_2_DESC: env.STEP_2_DESC || 'روی فایل deploy.bat دوبار کلیک کنید تا تمام تنظیمات و فایل‌ها به طور خودکار بهینه‌سازی شوند.',
  STEP_3_NUM: env.STEP_3_NUM || '۳',
  STEP_3_TITLE: env.STEP_3_TITLE || 'ورود به کلودفلر',
  STEP_3_DESC: env.STEP_3_DESC || 'در بار اول، مرورگر باز شده و با یک کلیک اکانت رایگان کلودفلر شما تایید می‌گردد.',
  STEP_4_NUM: env.STEP_4_NUM || '۴',
  STEP_4_TITLE: env.STEP_4_TITLE || 'انتشار جهانی سایت',
  STEP_4_DESC: env.STEP_4_DESC || 'سایت شما با دامنه اختصاصی و SSL رایگان در شبکه جهانی لبه کلودفلر آنلاین می‌شود.',

  // ۱۰. Posts & Notes Section
  SHOW_POSTS: env.SHOW_POSTS !== 'false',
  POSTS_EYEBROW: env.POSTS_EYEBROW || 'مستندات و مقالات',
  POSTS_TITLE: env.POSTS_TITLE || 'جدیدترین یادداشت‌ها',
  POSTS_DESCRIPTION: env.POSTS_DESCRIPTION || 'مطالب و مستنداتی که از طریق تلگرام یا پوشه docs اضافه شده‌اند.',

  // ۱۱. FAQ & QA Section
  SHOW_QA: env.SHOW_QA !== 'false',
  QA_EYEBROW: env.QA_EYEBROW || 'راهنما و سوالات',
  QA_TITLE: env.QA_TITLE || 'سوالات متداول و پرسش و پاسخ',
  QA_DESCRIPTION: env.QA_DESCRIPTION || 'پاسخ به سوالات پرتکرار و امکان مطرح کردن پرسش جدید به‌صورت آنلاین.',
  FAQ_1_Q: env.FAQ_1_Q || 'آیا میزبانی این وب‌سایت واقعاً ۱۰۰٪ رایگان است؟',
  FAQ_1_A: env.FAQ_1_A || 'بله؛ سرویس Cloudflare Pages و Workers پلن رایگان دائمی و بسیار سخاوتمندانه‌ای دارند که شامل ۱۰۰ هزار درخواست روزانه، گواهی SSL رایگان و پهنای باند نامحدود است.',
  FAQ_2_Q: env.FAQ_2_Q || 'چگونه محتوا و ظاهر سایت را تغییر دهم؟',
  FAQ_2_A: env.FAQ_2_A || 'کافی است فایل .env را در پوشه پروژه باز کنید و تمام متغیرها (از جمله نام، عنوان، متن‌ها، ایمیل، رنگ و شناسه‌ها) را به دلخواه خود تغییر دهید و مجدداً deploy.bat را اجرا نمایید.',
  FAQ_3_Q: env.FAQ_3_Q || 'چگونه ربات تلگرام را برای مدیریت سایت فعال کنم؟',
  FAQ_3_A: env.FAQ_3_A || 'در تلگرام به @BotFather پیام دهید و دستور /newbot را بزنید تا توکن ربات بگیرید. سپس شناسه عددی Chat ID خود را از @userinfobot بگیرید و در فایل .env قرار دهید.',
  FAQ_4_Q: env.FAQ_4_Q || 'آیا می‌توانم دامنه اختصاصی خودم (مثل .com یا .ir) را متصل کنم؟',
  FAQ_4_A: env.FAQ_4_A || 'بله؛ کلودفلر امکان اتصال بی‌شمار دامنه اختصاصی با فعال‌سازی خودکار HTTPS و بدون پرداخت هیچ هزینه‌ای را فراهم می‌کند.',

  // ۱۲. Contact Form
  SHOW_CONTACT: env.SHOW_CONTACT !== 'false',
  CONTACT_EYEBROW: env.CONTACT_EYEBROW || 'ارتباط مستقیم',
  CONTACT_TITLE: env.CONTACT_TITLE || 'فرم ارسال پیام و همکاری',
  CONTACT_DESCRIPTION: env.CONTACT_DESCRIPTION || 'پیام خود را مستقیم برای ربات تلگرام ارسال کنید تا در سریع‌ترین زمان پاسخ آن را دریافت نمایید.',
  CONTACT_EMAIL: env.CONTACT_EMAIL || 'contact@example.com',
  CONTACT_SUBMIT_SUCCESS_MSG: env.CONTACT_SUBMIT_SUCCESS_MSG || 'با تشکر! پیام شما با موفقیت مستقیماً به تلگرام ارسال شد.',

  // ۱۳. Section Toggles
  SHOW_DOCS: env.SHOW_DOCS !== 'false',

  // ۱۴. Social Profiles
  TELEGRAM_USERNAME: env.TELEGRAM_USERNAME || '',
  TELEGRAM_CHANNEL: env.TELEGRAM_CHANNEL || '',
  GITHUB_URL: env.GITHUB_URL || 'https://github.com/faithsaly5-stack/ZeroWeb',
  TWITTER_URL: env.TWITTER_URL || '',
  LINKEDIN_URL: env.LINKEDIN_URL || '',
  INSTAGRAM_URL: env.INSTAGRAM_URL || '',
  YOUTUBE_URL: env.YOUTUBE_URL || '',
  DISCORD_URL: env.DISCORD_URL || '',

  // ۱۵. Footer & Legal
  FOOTER_DESC: env.FOOTER_DESC || 'قالب آماده و متن‌باز برای ساخت وب‌سایت با میزبانی رایگان کلودفلر، پایگاه دانش و مستندات، و سیستم مدیریت تلگرام.',
  FOOTER_TAGLINE: env.FOOTER_TAGLINE || 'طراحی‌شده با معماری مدرن ابری روی شبکه جهانی کلودفلر و تلگرام.',
  FOOTER_COPYRIGHT: env.FOOTER_COPYRIGHT || '© ۲۰۲۶ تمامی حقوق محفوظ است — وبسایت رایگان خود را بسازید',

  // Backend / Cloudflare Info
  CLOUDFLARE_PROJECT_NAME: env.CLOUDFLARE_PROJECT_NAME || 'zeroweb',
  CUSTOM_DOMAIN: env.CUSTOM_DOMAIN || '',
  FILES_KV_ID: env.FILES_KV_ID || '',
  CONTACT_KV_ID: env.CONTACT_KV_ID || '',
  GOOGLE_ANALYTICS_ID: env.GOOGLE_ANALYTICS_ID || '',
  GOOGLE_SITE_VERIFICATION: env.GOOGLE_SITE_VERIFICATION || ''
};

// 4. Generate public/site-config.js (secure: browser-safe values only)
const clientConfig = { ...config };
delete clientConfig.BOT_TOKEN;
delete clientConfig.CHAT_ID;
delete clientConfig.ADMIN_PASS;
delete clientConfig.SECRET_TOKEN;
delete clientConfig.GEMINI_API_KEY;

const siteConfigJS = `// Auto-generated from .env by scripts/build_config.js
window.__SITE_CONFIG__ = ${JSON.stringify(clientConfig, null, 2)};
`;

fs.writeFileSync(path.join(rootDir, 'public', 'site-config.js'), siteConfigJS);
console.log('[+] Generated public/site-config.js successfully!');

// 5. Update wrangler.toml dynamically
const wranglerPath = path.join(rootDir, 'wrangler.toml');
let wranglerContent = `name = "${config.CLOUDFLARE_PROJECT_NAME}"
main = "_worker.js"
compatibility_date = "2024-06-28"
workers_dev = true
preview_urls = true

[assets]
directory = "public"
binding = "ASSETS"

[triggers]
crons = ["0 0 * * *"]
`;

if (config.CUSTOM_DOMAIN) {
  wranglerContent += `
routes = [
  { pattern = "${config.CUSTOM_DOMAIN}", custom_domain = true }
]
`;
}

if (config.FILES_KV_ID || config.CONTACT_KV_ID) {
  if (config.FILES_KV_ID) {
    wranglerContent += `
[[kv_namespaces]]
binding = "FILES_KV"
id = "${config.FILES_KV_ID}"
`;
  }
  if (config.CONTACT_KV_ID) {
    wranglerContent += `
[[kv_namespaces]]
binding = "CONTACT_KV"
id = "${config.CONTACT_KV_ID}"
`;
  }
}

fs.writeFileSync(wranglerPath, wranglerContent);
console.log('[+] Synced wrangler.toml successfully!');

// 6. Update robots.txt
const robotsPath = path.join(rootDir, 'public', 'robots.txt');
const domain = config.CUSTOM_DOMAIN || config.SITE_DOMAIN || 'example.com';
const robotsContent = `# Robots & Crawler Policy for ${config.SITE_NAME}
User-agent: *
Allow: /
Allow: /docs.html
Allow: /styles.css
Allow: /script.js
Allow: /fx.js
Allow: /favicon.svg
Allow: /og-image.jpg
Allow: /og-image-fa.jpg
Allow: /icons.svg

Disallow: /download/
Disallow: /api/
Disallow: /admin

Sitemap: https://${domain}/sitemap.xml
Host: ${domain}
`;
fs.writeFileSync(robotsPath, robotsContent);
console.log('[+] Updated public/robots.txt with host: ' + domain);

console.log('✨ Config compilation completed.');

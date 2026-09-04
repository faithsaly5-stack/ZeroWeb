/**
 * =================================================================================
 * |            BUILD YOUR OWN WEBSITE FOR FREE - CLOUDFLARE WORKER               |
 * |                         VERSION 5.0 (MODULAR ARCHITECTURE)                    |
 * =================================================================================
 * Core Web Worker & Router.
 * Bot logic, Telegram CMS, and background operations are imported from ./admin.js.
 */

import {
  handleTelegramWebhook,
  handleTelegramStatus,
  handleFileDownload,
  checkRateLimit,
  notifyAdmin
} from './admin.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- SEO: canonicalize host (301 www -> apex) ---
    if (url.hostname.startsWith('www.') && !url.hostname.includes('localhost')) {
      url.hostname = url.hostname.replace(/^www\./, '');
      return Response.redirect(url.toString(), 301);
    }

    // --- SEO: canonicalize paths (301 redirect duplicate endpoints to canonical URLs) ---
    if (url.pathname === '/index.html') {
      url.pathname = '/';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/docs') {
      url.pathname = '/docs.html';
      return Response.redirect(url.toString(), 301);
    }

    // --- SECURITY & CORS CONFIG ---
    function getCorsHeaders(request) {
      const origin = request.headers.get('Origin');
      const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
      if (allowed.includes('*') || (origin && allowed.includes(origin))) {
        return {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-App-Key, Authorization, X-Telegram-Bot-Api-Secret-Token',
          'Vary': 'Origin'
        };
      }
      return { 'Access-Control-Allow-Origin': 'null' };
    }

    // Handle OPTIONS (Preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    try {
      switch (url.pathname) {
        case '/':
        case '/index.html':
          return serveAssetWithCache(request, env);

        case '/docs.html':
        case '/robots.txt':
        case '/styles.css':
        case '/script.js':
        case '/fx.js':
          return serveAssetWithCache(request, env);

        case '/sitemap.xml':
          return handleDynamicSitemap(request, env);

        case '/api/docs_list':
          return handleDocsList(request, env);

        case '/api/contact':
          if (request.method === 'POST') return handleApiContact(request, env);
          break;

        case '/api/order':
          if (request.method === 'POST') {
            const ipOrder = request.headers.get('CF-Connecting-IP') || 'unknown';
            const allowedOrder = await checkRateLimit(ipOrder, env, 'order', 5, 60);
            if (!allowedOrder) return new Response('Too Many Requests', { status: 429 });
            return handleApiOrder(request, env);
          }
          break;

        case '/api/content':
          return handleApiContent(env, request);

        case '/api/announcement':
          return handleApiAnnouncement(env, request);

        case '/api/public-messages':
          return handleApiGetPublicMessages(env, request);

        case '/api/telegram-status':
          return handleTelegramStatus(request, env);

        case '/api/telegram-webhook':
          if (request.method === 'POST') return handleTelegramWebhook(request, env);
          return new Response('Telegram webhook endpoint active. Send POST requests from Telegram.', {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });

        case '/admin':
          return new Response('پنل مدیریت وب غیرفعال شده است. کلیه امور مدیریت و ارسال فایل و محتوا از طریق پنل مدیریت متمرکز ربات تلگرام انجام می‌شود.', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }

      const downloadMatch = url.pathname.match(/^\/download\/(.+)/);
      if (downloadMatch) return handleFileDownload(downloadMatch[1], env);

      // Default asset fallback with performance cache headers
      return serveAssetWithCache(request, env);

    } catch (e) {
      console.error('Unhandled Worker error:', e);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

// ============================================================================
//  STATIC ASSET CACHE & SECURITY ENGINE
// ============================================================================

async function serveAssetWithCache(request, env) {
  try {
    const resp = await env.ASSETS.fetch(request);
    if (!resp.ok && resp.status === 404) {
      const fallback = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
      return addSecurityHeaders(fallback, 'public, max-age=0, must-revalidate');
    }

    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    let cacheControl = 'public, max-age=3600'; // 1 hour for HTML pages
    if (path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.svg') || 
        path.endsWith('.woff2') || path.endsWith('.woff') || path.endsWith('.png') || 
        path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.webp') || 
        path.endsWith('.ico')) {
      cacheControl = 'public, max-age=31536000, immutable'; // 1 year immutable cache
    } else if (path.endsWith('.json') || path === '/robots.txt' || path === '/sitemap.xml') {
      cacheControl = 'public, max-age=86400'; // 1 day
    }

    return addSecurityHeaders(resp, cacheControl);
  } catch (err) {
    return new Response('Asset Fetch Error', { status: 500 });
  }
}

function addSecurityHeaders(response, cacheControl) {
  const newHeaders = new Headers(response.headers);
  if (cacheControl) {
    newHeaders.set('Cache-Control', cacheControl);
  }
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
  newHeaders.set('Cross-Origin-Resource-Policy', 'same-origin');
  newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self' https://api.telegram.org; frame-ancestors 'self'; base-uri 'self'; form-action 'self';");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// ============================================================================
//  API HANDLERS & HELPERS
// ============================================================================

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function jsonResponse(data, status = 200, customHeaders = {}, request = null) {
  const origin = request ? request.headers.get('Origin') : null;
  const allowOrigin = origin || '*';
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Key, Authorization, X-Telegram-Bot-Api-Secret-Token',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      ...customHeaders
    }
  });
}

async function handleApiContact(request, env) {
  try {
    let { name, message, website } = await request.json();

    // Honeypot: real users never see this hidden field. Pretend success to bots.
    if (website) return jsonResponse({ success: true }, 200, {}, request);

    const clip = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '');
    const cleanUserText = (s) => (typeof s === 'string' ? s.replace(/(?:🆔|ID:|\[SYSTEM_REF:)[^\n]*/gi, '').trim() : '');

    name = cleanUserText(clip(name, 80));
    message = cleanUserText(clip(message, 1000));
    if (!name || !message) return jsonResponse({ error: 'Missing data' }, 400, {}, request);

    // Rate limit: max 3 questions/min per IP
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!(await checkRateLimit(ip, env, 'qa', 3, 60))) {
      return jsonResponse({ error: 'Too many requests' }, 429, {}, request);
    }

    // Store in KV
    const messageId = 'qa_' + crypto.randomUUID();
    await env.CONTACT_KV.put(messageId, JSON.stringify({
      id: messageId, type: 'qa', name, message, isPublic: false, timestamp: Date.now()
    }));

    // Send notification to Admin Telegram with tamper-resistant System Ref header
    const text =
      `[SYSTEM_REF: ${messageId}]\n\n` +
      '📬 سوال جدید از وب‌سایت\n\n' +
      '👤 نام: ' + name + '\n' +
      '📝 پیام:\n' + message + '\n\n' +
      'ریپلای کنید تا پاسخ در سایت منتشر شود.\n' +
      'دستورها: «حذف» (پاک‌کردن سوال) · «مخفی» (برداشتن از سایت)';

    try {
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.CHAT_ID, text }),
      });
    } catch (e) { }

    return jsonResponse({ success: true }, 200, {}, request);
  } catch (error) {
    return jsonResponse({ error: 'Error' }, 500, {}, request);
  }
}

async function handleApiOrder(request, env) {
  try {
    let { name, contact, service, budget, deadline, details } = await request.json();
    if (!name || !contact || !details) return jsonResponse({ error: 'Missing data' }, 400, {}, request);

    const clip = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '');
    const cleanUserText = (s) => (typeof s === 'string' ? s.replace(/(?:🆔|ID:|\[SYSTEM_REF:)[^\n]*/gi, '').trim() : '');

    name = cleanUserText(clip(name, 120));
    contact = cleanUserText(clip(contact, 200));
    service = cleanUserText(clip(service, 140));
    budget = cleanUserText(clip(budget, 120));
    deadline = cleanUserText(clip(deadline, 120));
    details = cleanUserText(clip(details, 2000));
    if (!name || !contact || !details) return jsonResponse({ error: 'Missing data' }, 400, {}, request);

    const orderId = 'order_' + crypto.randomUUID();

    await env.CONTACT_KV.put(orderId, JSON.stringify({
      id: orderId, type: 'order', name, contact, service, budget, deadline, details,
      isPublic: false, timestamp: Date.now()
    }));

    const text =
      `[SYSTEM_REF: ${orderId}]\n\n` +
      '🛒 سفارش جدید از وب‌سایت\n\n' +
      '👤 نام: ' + name + '\n' +
      '📞 راه ارتباط: ' + contact + '\n' +
      '🧩 خدمت: ' + (service || '—') + '\n' +
      '💰 بودجه: ' + (budget || '—') + '\n' +
      '⏳ مهلت: ' + (deadline || '—') + '\n\n' +
      '📝 توضیحات:\n' + details + '\n\n' +
      'ریپلای کنید تا یادداشت خصوصی روی سفارش ذخیره شود (هرگز منتشر نمی‌شود).\n' +
      '🕒 ' + new Date().toISOString();

    try {
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.CHAT_ID, text }),
      });
    } catch (e) { }

    return jsonResponse({ success: true }, 200, {}, request);
  } catch (error) {
    return jsonResponse({ error: 'Error' }, 500, {}, request);
  }
}

// ============================================================================

// ============================================================================
//  PUBLIC CONTENT, ANNOUNCEMENT & QA MESSAGES APIS
// ============================================================================

async function handleApiAnnouncement(env, request = null) {
  try {
    if (!env.CONTACT_KV) return jsonResponse({ active: false }, 200, {}, request);
    const data = await env.CONTACT_KV.get('SITE_ANNOUNCEMENT', { type: 'json' });
    return jsonResponse(data || { active: false }, 200, {}, request);
  } catch (e) {
    return jsonResponse({ active: false }, 200, {}, request);
  }
}

async function handleApiGetPublicMessages(env, request = null) {
  if (!env.CONTACT_KV) return jsonResponse([], 200, {}, request);
  try {
    const list = await env.CONTACT_KV.list({ limit: 1000 });
    const keys = (list.keys || []).filter(k => !k.name.startsWith('rate::') && !k.name.startsWith('order_') && k.name !== 'SITE_ANNOUNCEMENT' && k.name !== 'DAILY_WORD_OVERRIDE');
    const allMsg = await Promise.all(keys.map(key => env.CONTACT_KV.get(key.name, { type: 'json' }).catch(() => null)));
    const publics = allMsg
      .filter(m => m && typeof m === 'object' && m.type !== 'order' && m.isPublic && m.reply_text)
      .sort((a, b) => (b.replied_at || b.timestamp || 0) - (a.replied_at || a.timestamp || 0))
      .slice(0, 50)
      .map(m => ({ id: m.id, name: m.name, message: m.message, reply_text: m.reply_text, replied_at: m.replied_at || m.timestamp }));
    return jsonResponse(publics, 200, {}, request);
  } catch (e) {
    console.error('handleApiGetPublicMessages error:', e);
    return jsonResponse([], 200, {}, request);
  }
}

async function handleApiContent(env, request = null) {
  try {
    let items = [];
    if (env.FILES_KV) {
      const list = await env.FILES_KV.list({ limit: 1000 });
      const validKeys = (list.keys || []).filter(k => 
        k.name !== 'AI_DOCS_CATEGORIES' && 
        k.name !== 'AI_CRON_STATUS' && 
        k.name !== 'STATIC_TITLE_OVERRIDES' && 
        k.name !== 'STATIC_TYPE_OVERRIDES'
      );
      const all = await Promise.all(validKeys.map(k => env.FILES_KV.get(k.name, { type: 'json' }).catch(() => null)));
      items = all.filter(Boolean).filter(it => it.is_article || it.type === 'post' || it.type === 'article').sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Also check static notes marked as articles
      try {
        const rawTypes = await env.FILES_KV.get('STATIC_TYPE_OVERRIDES');
        if (rawTypes) {
          const typeOverrides = JSON.parse(rawTypes);
          const rawTitles = await env.FILES_KV.get('STATIC_TITLE_OVERRIDES').catch(() => null);
          const titleOverrides = rawTitles ? JSON.parse(rawTitles) : {};

          if (env.ASSETS) {
            let assetRes = await env.ASSETS.fetch(new Request('http://localhost/docs_list.json'));
            if (assetRes.ok) {
              const staticList = await assetRes.json();
              for (const item of staticList) {
                if (typeOverrides[item.file] === 'article') {
                  items.push({
                    id: 'static_' + item.file,
                    title: titleOverrides[item.file] || item.title || item.file,
                    content: item.text || item.title,
                    description: item.text || item.title,
                    category: item.category || '📝 مقالات و مستندات',
                    is_article: true,
                    type: 'article',
                    timestamp: Date.now()
                  });
                }
              }
            }
          }
        }
      } catch (e) { }
    }
    return jsonResponse(items, 200, { 'Cache-Control': 'no-cache' }, request);
  } catch (e) {
    console.error('handleApiContent error:', e);
    return jsonResponse([], 200, {}, request);
  }
}

// ============================================================================
//  DOCUMENTATION & FILES UNIFIED API
// ============================================================================

async function handleDocsList(request, env) {
  let staticDocs = [];
  try {
    let assetReq = new Request(new URL('/docs_list.json', request.url));
    let res = await (env.ASSETS ? env.ASSETS.fetch(assetReq) : fetch(assetReq));
    if (res.ok) {
      staticDocs = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch static docs:', err);
  }

  let aiCategories = {};
  let titleOverrides = {};
  try {
    if (env.FILES_KV) {
      let aiCategoriesRaw = await env.FILES_KV.get('AI_DOCS_CATEGORIES');
      if (aiCategoriesRaw) aiCategories = JSON.parse(aiCategoriesRaw);
      let titleOverridesRaw = await env.FILES_KV.get('STATIC_TITLE_OVERRIDES');
      if (titleOverridesRaw) titleOverrides = JSON.parse(titleOverridesRaw);
    }
  } catch (err) {
    console.error('Failed to parse categories or titles:', err);
  }

  const customBlocklist = (env.CENSOR_KEYWORDS || '').split(',').map(s => s.trim()).filter(Boolean);
  function maskTitle(title) {
    if (!title || customBlocklist.length === 0) return title;
    let masked = title;
    for (const phrase of customBlocklist) {
      const safePhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const phraseRegex = new RegExp(safePhrase, 'gi');
      masked = masked.replace(phraseRegex, '***');
    }
    return masked;
  }

  const mergedStaticDocs = staticDocs.map(doc => {
    if (aiCategories[doc.file]) {
      doc.category = aiCategories[doc.file];
    }
    const rawTitle = titleOverrides[doc.file] || doc.title;
    if (rawTitle) doc.title = maskTitle(rawTitle);
    doc.is_file = false;
    return doc;
  }).filter(doc => doc.category !== '❌ حذف شده');

  const dynamicDocs = [];
  try {
    if (env.FILES_KV) {
      const list = await env.FILES_KV.list({ limit: 1000 });
      const validKeys = (list.keys || []).filter(k => k.name !== 'STATIC_TITLE_OVERRIDES');
      const items = await Promise.all(validKeys.map(k => env.FILES_KV.get(k.name, { type: 'json' }).catch(() => null)));
      for (const item of items) {
        if (!item) continue;
        const isFile = !!item.file_id || item.type === 'document' || item.type === 'audio' || item.type === 'video' || item.type === 'file';
        const isPureArticle = item.is_article === true || (item.type === 'post' && !item.file_id && !item.is_doc);

        if (isFile || !isPureArticle) {
          let itemCategory = item.category;
          if (!itemCategory || itemCategory === 'عمومی' || itemCategory === 'یادداشت' || itemCategory === 'دسته‌بندی‌نشده' || itemCategory === 'unorganized') {
            itemCategory = '📁 فایل‌ها و مستندات دسته‌بندی‌نشده';
          }
          dynamicDocs.push({
            id: item.id || item.file_id,
            file: item.id || item.file_id,
            title: maskTitle(item.title || item.file_name || 'مستند جدید'),
            category: itemCategory,
            text: item.description || item.content || (item.file_name ? `دانلود فایل: ${item.file_name}` : ''),
            path: item.file_id ? `/download/${item.file_id}` : (item.id ? `/download/${item.id}` : '/#posts'),
            timestamp: item.timestamp || Date.now(),
            is_dynamic: true,
            is_file: isFile,
            type: item.type || (isFile ? 'file' : 'post'),
            file_name: item.file_name || ''
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to load dynamic docs and files:', err);
  }

  const allDocs = [...dynamicDocs, ...mergedStaticDocs];

  return jsonResponse(allDocs, 200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
}

// ============================================================================
//  DYNAMIC REAL-TIME SITEMAP ENGINE (Always Fresh SEO Crawler Discovery)
// ============================================================================

async function handleDynamicSitemap(request, env) {
  try {
    const origin = env.SITE_DOMAIN ? ('https://' + env.SITE_DOMAIN.replace(/^https?:\/\//, '')) : (new URL(request.url).origin);
    const today = new Date().toISOString().slice(0, 10);
    const xmlEscape = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const isoDate = (ts) => {
      const d = ts ? new Date(Number(ts)) : null;
      return (d && !isNaN(d)) ? d.toISOString().slice(0, 10) : today;
    };

    const urls = [];
    const add = (loc, { lastmod = today, changefreq = 'weekly', priority = '0.5' } = {}) =>
      urls.push({ loc: origin + loc, lastmod, changefreq, priority });

    // 1. Core indexed pages with canonical paths
    add('/', { changefreq: 'daily', priority: '1.0' });
    add('/docs.html', { changefreq: 'daily', priority: '0.9' });

    // 2. Fetch documentation dynamically from assets
    try {
      let docsReq = new Request(new URL('/docs_list.json', request.url));
      let docsRes = await env.ASSETS.fetch(docsReq);
      if (docsRes.ok) {
        const docs = await docsRes.json();
        docs.forEach((n) => {
          if (!n.path) return;
          if (n.category === '❌ حذف شده') return;
          add(n.path, { changefreq: 'monthly', priority: '0.6', lastmod: isoDate(n.timestamp) });
        });
      }
    } catch (e) {
      console.warn('Dynamic sitemap docs error:', e.message);
    }

    const xmlBody = urls.map((u) =>
      `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    ).join('\n');

    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlBody}\n</urlset>\n`;

    return new Response(sitemapXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=14400',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'all'
      }
    });
  } catch (err) {
    console.error('Dynamic sitemap fallback to static asset:', err);
    return serveAssetWithCache(request, env);
  }
}

/**
 * =================================================================================
 * |                     TELEGRAM CMS BOT & ADMIN ENGINE                           |
 * |                         VERSION 5.0 (MODULAR CMS)                             |
 * =================================================================================
 * Features:
 * - Full Telegram CMS & Bot Webhook Controller
 * - Dynamic KV management (FILES_KV, CONTACT_KV)
 * - Multi-key Gemini AI integration for automated document categorization & WotD
 * - Interactive Inline Keyboards (Files, Categories, Documents, Q&As, Orders, Banners)
 * - Anti-abuse Rate Limiting & Admin Notification System
 */

// ============================================================================
//  CONSTANTS & TAXONOMY
// ============================================================================

export const DEFAULT_TG_CATEGORIES = [
  { code: '1', name: '🚀 مقالات و آموزش‌ها', short: 'آموزش' },
  { code: '2', name: '💻 پروژه‌ها و کدها', short: 'پروژه‌ها' },
  { code: '3', name: '📚 مقالات و مستندات', short: 'مستندات' },
  { code: '4', name: '💡 ایده‌ها و یادداشت‌ها', short: 'ایده‌ها' },
  { code: '5', name: '🛠 ابزارها و راهنماها', short: 'ابزارها' },
  { code: '6', name: '📁 دسته‌بندی عمومی', short: 'عمومی' }
];

export let TG_CATEGORIES = [...DEFAULT_TG_CATEGORIES];

export function initCategories(env) {
  if (env && env.TG_CATEGORIES) {
    try {
      TG_CATEGORIES = JSON.parse(env.TG_CATEGORIES);
    } catch (e) { }
  }
}

export function getCategoryByCode(code) {
  const item = TG_CATEGORIES.find(c => c.code === String(code));
  return item ? item.name : (TG_CATEGORIES[0]?.name || '📁 دسته‌بندی عمومی');
}

export function getCategoryCodeByName(name) {
  if (!name) return '1';
  const item = TG_CATEGORIES.find(c => name.includes(c.short) || name === c.name);
  return item ? item.code : '1';
}

// ============================================================================
//  TELEGRAM API CORE HELPERS
// ============================================================================

export async function sendTg(env, chatId, text, replyToMessageId = null, replyMarkup = null) {
  if (!env.BOT_TOKEN || !chatId) return false;
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    };
    if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;
    if (replyMarkup) payload.reply_markup = replyMarkup;

    let res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // If Markdown parsing fails due to special characters, fallback to plain text
    if (!res.ok) {
      delete payload.parse_mode;
      res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    return res.ok;
  } catch (err) {
    console.error('sendTg error:', err);
    return false;
  }
}

export async function editTgText(env, chatId, messageId, text, replyMarkup = null) {
  if (!env.BOT_TOKEN || !chatId || !messageId) return false;
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown'
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    let res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      delete payload.parse_mode;
      res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    return res.ok;
  } catch (err) {
    console.error('editTgText error:', err);
    return false;
  }
}

export async function answerCallback(env, callbackQueryId, text = null, showAlert = false) {
  if (!env.BOT_TOKEN || !callbackQueryId) return false;
  try {
    const payload = { callback_query_id: callbackQueryId };
    if (text) {
      payload.text = text;
      payload.show_alert = showAlert;
    }
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('answerCallback error:', err);
    return false;
  }
}

export async function notifyAdmin(env, title, message, replyMarkup = null) {
  if (!env.BOT_TOKEN || !env.CHAT_ID) return;
  const text = `🔔 **${title}**\n\n${message}`;
  await sendTg(env, env.CHAT_ID, text, null, replyMarkup);
}

export async function registerBotCommands(env) {
  if (!env.BOT_TOKEN) return;
  try {
    const commands = [
      { command: 'start', description: 'منوی اصلی مدیریت وب‌سایت' },
      { command: 'add_note', description: 'افزودن مستند و فایل جدید' },
      { command: 'add_article', description: 'افزودن مقاله و یادداشت جدید' },
      { command: 'notes', description: 'مدیریت مستندات و فایل‌ها' },
      { command: 'articles', description: 'مدیریت مقالات و یادداشت‌ها' },
      { command: 'files', description: 'لیست تمام فایل‌های سایت' },
      { command: 'orders', description: 'سفارش‌های همکاری' },
      { command: 'qas', description: 'پرسش و پاسخ کاربران' },
      { command: 'announce', description: 'تنظیم بنر اطلاعیه سایت' },
      { command: 'stats', description: 'آمار و گزارش زنده سایت' },
      { command: 'status', description: 'بررسی سلامت زیرساخت' },
    ];
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });
  } catch (e) {
    console.error('registerBotCommands error:', e);
  }
}

// ============================================================================
//  RATE LIMITING & SECURITY
// ============================================================================

export async function checkRateLimit(ip, env, scope = 'default', maxAllowed = 30, windowSeconds = 60) {
  if (!env.CONTACT_KV) return true;
  try {
    const key = `rate::${scope}::${ip}`;
    const raw = await env.CONTACT_KV.get(key);
    let count = raw ? parseInt(raw, 10) : 0;
    if (count >= maxAllowed) return false;
    count++;
    await env.CONTACT_KV.put(key, String(count), { expirationTtl: windowSeconds });
    return true;
  } catch (e) {
    return true;
  }
}

// ============================================================================
//  INLINE KEYBOARDS BUILDER
// ============================================================================

export function getCategoryKeyboard(itemId, currentCategory = 'عمومی', isDocument = false, isArticle = false, isStatic = false) {
  const curCode = getCategoryCodeByName(currentCategory);

  const catButtons = [];
  for (let i = 0; i < TG_CATEGORIES.length; i += 2) {
    const row = [];
    const c1 = TG_CATEGORIES[i];
    row.push({ text: (curCode === c1.code ? '✅ ' : '') + c1.short, callback_data: `c:${itemId}:${c1.code}` });
    if (TG_CATEGORIES[i + 1]) {
      const c2 = TG_CATEGORIES[i + 1];
      row.push({ text: (curCode === c2.code ? '✅ ' : '') + c2.short, callback_data: `c:${itemId}:${c2.code}` });
    }
    catButtons.push(row);
  }

  const keyboard = [
    [
      { text: (isDocument ? '✅ ' : '') + '📚 مستند / فایل', callback_data: `t:${itemId}:s` },
      { text: (isArticle ? '✅ ' : '') + '📝 مقاله و یادداشت', callback_data: `t:${itemId}:a` }
    ],
    ...catButtons,
    [
      { text: '✏️ تغییر عنوان', callback_data: `rn:${itemId}` },
      { text: '🗑 حذف از سایت', callback_data: `del:${itemId}` }
    ],
    [
      { text: '📁 لیست تمام فایل‌ها', callback_data: 'menu:files' },
      { text: '🔙 منوی اصلی', callback_data: 'menu:home' }
    ]
  ];

  return { inline_keyboard: keyboard };
}

export function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '➕ افزودن مستند / فایل', callback_data: 'add:note' },
        { text: '➕ افزودن یادداشت', callback_data: 'add:article' }
      ],
      [
        { text: '📚 مستندات و فایل‌ها', callback_data: 'menu:notes' },
        { text: '📝 یادداشت‌ها', callback_data: 'menu:articles' }
      ],
      [
        { text: '🛒 سفارش‌های همکاری', callback_data: 'menu:orders' },
        { text: '💬 پرسش و پاسخ', callback_data: 'menu:qas' }
      ],
      [
        { text: '📢 بنر اطلاعیه سایت', callback_data: 'menu:announce' },
        { text: '💡 واژهٔ روز (WotD)', callback_data: 'menu:word' }
      ],
      [
        { text: '📊 داشبورد و آمار زنده', callback_data: 'menu:stats' },
        { text: '⚡️ وضعیت سلامت زیرساخت', callback_data: 'menu:sys_status' }
      ],
      [
        { text: '🔄 تازه‌سازی منوی اصلی', callback_data: 'menu:home' }
      ]
    ]
  };
}

// ============================================================================
//  MATERIAL LOOKUP & DATA REPOSITORIES
// ============================================================================

export async function getAllSiteMaterials(env) {
  const materials = [];

  // 1. Dynamic materials from FILES_KV
  if (env.FILES_KV) {
    try {
      const list = await env.FILES_KV.list({ limit: 1000 });
      const validKeys = (list.keys || []).filter(k => 
        k.name !== 'STATIC_TITLE_OVERRIDES' && 
        k.name !== 'STATIC_TYPE_OVERRIDES'
      );
      const dynamicItems = await Promise.all(validKeys.map(async (k, idx) => {
        const it = await env.FILES_KV.get(k.name, { type: 'json' }).catch(() => null);
        if (it) {
          it._key = k.name;
          it.is_dynamic = true;
          it.is_static = false;

          // Ensure it.id is short (< 22 chars) so inline button callback_data is NEVER rejected by Telegram
          let shortId = it.id;
          if (!shortId || shortId.length > 20) {
            shortId = 'd_' + (it.file_id ? it.file_id.slice(-12) : k.name.slice(-12));
          }
          it.id = shortId;

          if (it.is_article === undefined) {
            it.is_article = (it.type === 'post' || it.type === 'article');
          }
          if (it.is_document === undefined) {
            it.is_document = !it.is_article;
          }
          return it;
        }
        return null;
      }));
      const cleanDyn = dynamicItems.filter(Boolean).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      materials.push(...cleanDyn);
    } catch (e) {
      console.error('Dynamic materials fetch error:', e);
    }
  }

  // 2. Static materials from docs_list.json + AI_DOCS_CATEGORIES + STATIC_TITLE_OVERRIDES + STATIC_TYPE_OVERRIDES
  let titleOverrides = {};
  let typeOverrides = {};
  if (env.FILES_KV) {
    try {
      const rawTitles = await env.FILES_KV.get('STATIC_TITLE_OVERRIDES');
      if (rawTitles) titleOverrides = JSON.parse(rawTitles);
      const rawTypes = await env.FILES_KV.get('STATIC_TYPE_OVERRIDES');
      if (rawTypes) typeOverrides = JSON.parse(rawTypes);
    } catch (e) { }
  }

  try {
    if (env.ASSETS) {
      let assetRes = await env.ASSETS.fetch(new Request('http://localhost/docs_list.json'));
      if (!assetRes.ok) {
        
      }
      if (assetRes.ok) {
        const staticList = await assetRes.json();
        for (let i = 0; i < staticList.length; i++) {
          const item = staticList[i];
          const cat = item.category || '📚 مستندات و فایل‌ها';
          if (cat === '❌ حذف شده') continue;
          const customTitle = titleOverrides[item.file] || item.title || item.file;
          const isArticle = typeOverrides[item.file] === 'article';
          const isDocument = !isArticle;
          materials.push({
            id: 's_' + i,
            static_file: item.file,
            static_index: i,
            title: customTitle,
            description: item.text || '',
            content: item.text || '',
            category: cat,
            is_document: isDocument,
            is_article: isArticle,
            is_static: true,
            is_dynamic: false,
            type: isArticle ? 'article' : 'document',
            timestamp: 0
          });
        }
      }
    }
  } catch (e) {
    console.error('Static materials fetch error:', e);
  }

  return materials;
}

export async function findFileRecord(env, itemId) {
  if (!itemId) return null;

  // 1. Static note by index (e.g. s_0, s_12, s_200)
  if (itemId.startsWith('s_')) {
    const idx = parseInt(itemId.substring(2), 10);
    let titleOverrides = {};
    let typeOverrides = {};
    if (env.FILES_KV) {
      try {
        const raw = await env.FILES_KV.get('AI_DOCS_CATEGORIES').catch(() => null);
        if (raw) aiCategories = JSON.parse(raw);
        const rawTitles = await env.FILES_KV.get('STATIC_TITLE_OVERRIDES').catch(() => null);
        if (rawTitles) titleOverrides = JSON.parse(rawTitles);
        const rawTypes = await env.FILES_KV.get('STATIC_TYPE_OVERRIDES').catch(() => null);
        if (rawTypes) typeOverrides = JSON.parse(rawTypes);
      } catch (e) { }
    }

    try {
      if (env.ASSETS) {
        let assetRes = await env.ASSETS.fetch(new Request('http://localhost/docs_list.json'));
        if (!assetRes.ok) {
          
        }
        if (assetRes.ok) {
          const list = await assetRes.json();
          const item = !isNaN(idx) && list[idx] ? list[idx] : list.find(n => n.file === itemId.substring(2));
          if (item) {
            const actualIdx = list.indexOf(item);
            const curCat = item.category || '📚 مستندات و فایل‌ها';
            const curTitle = titleOverrides[item.file] || item.title || item.file;
            const isArticle = typeOverrides[item.file] === 'article';
            const isDocument = !isArticle;
            return {
              isStatic: true,
              staticFile: item.file,
              staticIndex: actualIdx >= 0 ? actualIdx : idx,
              key: 's_' + (actualIdx >= 0 ? actualIdx : idx),
              data: {
                id: 's_' + (actualIdx >= 0 ? actualIdx : idx),
                title: curTitle,
                file: item.file,
                category: curCat,
                text: item.text || '',
                content: item.text || '',
                description: item.text || '',
                is_document: isDocument,
                is_article: isArticle,
                type: isArticle ? 'article' : 'static_note'
              }
            };
          }
        }
      }
    } catch (e) {
      console.error('findFileRecord static error:', e);
    }
    return null;
  }

  // 2. Dynamic file/post from KV
  if (env.FILES_KV) {
    // Direct key hit
    let directData = await env.FILES_KV.get(itemId, { type: 'json' }).catch(() => null);
    if (directData) {
      if (directData.is_article === undefined) {
        directData.is_article = (directData.type === 'post' || directData.type === 'article');
      }
      if (directData.is_document === undefined) {
        directData.is_document = !directData.is_article;
      }
      let shortId = directData.id;
      if (!shortId || shortId.length > 20) {
        shortId = 'd_' + (directData.file_id ? directData.file_id.slice(-12) : itemId.slice(-12));
      }
      directData.id = shortId;
      return {
        isStatic: false,
        key: itemId,
        data: directData
      };
    }

    // Search keys by prefix/suffix or matching file_id / id
    const list = await env.FILES_KV.list({ limit: 1000 });
    for (const k of list.keys) {
      if (k.name === 'AI_DOCS_CATEGORIES' || k.name === 'AI_CRON_STATUS' || k.name === 'STATIC_TITLE_OVERRIDES' || k.name === 'STATIC_TYPE_OVERRIDES') continue;
      
      const suffixMatch = itemId.startsWith('d_') && (k.name.endsWith(itemId.substring(2)) || k.name === itemId);
      const val = await env.FILES_KV.get(k.name, { type: 'json' }).catch(() => null);
      if (val) {
        const isMatch = suffixMatch ||
          val.id === itemId ||
          val.file_id === itemId ||
          k.name === itemId ||
          (itemId.startsWith('d_') && val.file_id && val.file_id.endsWith(itemId.substring(2)));

        if (isMatch) {
          if (val.is_article === undefined) {
            val.is_article = (val.type === 'post' || val.type === 'article');
          }
          if (val.is_document === undefined) {
            val.is_document = !val.is_article;
          }
          val.id = itemId;
          return {
            isStatic: false,
            key: k.name,
            data: val
          };
        }
      }
    }
  }
  return null;
}

// ============================================================================
//  TELEGRAM SECURITY & UTILITY HELPERS
// ============================================================================

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function getFirstNWords(text, n = 200) {
  if (!text || typeof text !== 'string') return '';
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  return words.slice(0, n).join(' ');
}

export async function callGemini(prompt, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Gemini API key not configured');
  }
  const key = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 250
    }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini API error (${resp.status}): ${errText.slice(0, 100)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

export async function generateAiDailyWord(env) {
  const prompt = `You are an expert English language educator. Generate one advanced academic or technology vocabulary word for modern creators and developers.
Output ONLY a raw JSON object with no markdown fences, matching this structure:
{
  "word": "Optimization",
  "pron": "/ˌɒp.tɪ.maɪˈzeɪ.ʃən/",
  "type": "noun",
  "meaning": "بهینه‌سازی؛ بهبود کارایی و سرعت سیستم",
  "example": "Code optimization improves application performance and speed.",
  "example_fa": "بهینه‌سازی کد، کارایی و سرعت اجرای برنامه را افزایش می‌دهد.",
  "synonyms": "enhancement, refinement, improvement",
  "tip": "از اصول کلیدی در ساخت وب‌سایت‌های سریع و مدرن است.",
  "icon": "⚡"
}`;

  const raw = await callGemini(prompt, env.GEMINI_API_KEY);
  let cleaned = raw.replace(/^```json/i, '').replace(/```$/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    word: String(parsed.word || 'Optimization').trim(),
    pron: String(parsed.pron || '').trim(),
    type: String(parsed.type || 'noun').trim(),
    meaning: String(parsed.meaning || '').trim(),
    example: String(parsed.example || '').trim(),
    example_fa: String(parsed.example_fa || '').trim(),
    synonyms: String(parsed.synonyms || '').trim(),
    tip: String(parsed.tip || '').trim(),
    icon: String(parsed.icon || '🌟').trim()
  };
}

export async function processAICategories(env, count = 15) {
  if (!env.FILES_KV) return { processed: 0, remaining: 0, message: 'FILES_KV not connected' };
  if (!env.GEMINI_API_KEY) return { processed: 0, remaining: 0, message: 'GEMINI_API_KEY not configured' };

  let aiCategories = {};
  try {
    const raw = await env.FILES_KV.get('AI_DOCS_CATEGORIES');
    if (raw) aiCategories = JSON.parse(raw);
  } catch (e) {}

  let allMaterials = [];
  try {
    allMaterials = await getAllSiteMaterials(env);
  } catch (e) {
    return { processed: 0, remaining: 0, message: 'Failed to load site materials' };
  }

  const uncategorized = allMaterials.filter(m => {
    const cat = aiCategories[m.static_file || m.id] || m.category;
    return !cat || cat === 'عمومی' || cat === 'دسته‌بندی‌نشده' || cat === '📚 مستندات و فایل‌ها';
  });

  if (uncategorized.length === 0) {
    return { processed: 0, remaining: 0, message: 'All materials already categorized' };
  }

  const batch = uncategorized.slice(0, count);
  const processedFiles = [];

  for (const item of batch) {
    try {
      const rawText = (item.title ? item.title + '\n' : '') + (item.content || item.description || item.text || '');
      const snippet = getFirstNWords(rawText, 150);

      const catListStr = TG_CATEGORIES.map((c, idx) => `${idx + 1}. ${c.name}`).join('\n');
      const aiPrompt = `You are a content taxonomy AI. Choose the single best category for this article/document from the list below:
${catListStr}

Title: ${item.title || 'Unknown'}
Content Snippet:
${snippet}

Respond ONLY with the exact category name.`;

      const rawCategory = await callGemini(aiPrompt, env.GEMINI_API_KEY);
      let assignedCat = (rawCategory || '').trim().replace(/[*_`]/g, '');
      const matchCat = TG_CATEGORIES.find(c => assignedCat.includes(c.short) || assignedCat === c.name);
      if (matchCat) assignedCat = matchCat.name;
      else assignedCat = TG_CATEGORIES[0]?.name || '📁 دسته‌بندی عمومی';

      if (item.is_static) {
        aiCategories[item.static_file] = assignedCat;
      } else {
        item.category = assignedCat;
        await env.FILES_KV.put(item._key || item.id, JSON.stringify(item));
      }
      processedFiles.push({ title: item.title, file: item.static_file || item.id, category: assignedCat });
    } catch (err) {
      console.error('Error categorizing item:', item.title, err);
    }
  }

  await env.FILES_KV.put('AI_DOCS_CATEGORIES', JSON.stringify(aiCategories));

  return {
    processed: processedFiles.length,
    remaining: Math.max(0, uncategorized.length - processedFiles.length),
    processedFiles
  };
}

// ============================================================================
//  TELEGRAM STATUS & FILE DOWNLOAD ENDPOINTS
// ============================================================================

export async function handleTelegramStatus(request, env) {
  const configuredSecret = env.ADMIN_PASS || env.SECRET_TOKEN;
  const url = new URL(request.url);
  const authHeader = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || 
                     request.headers.get('X-Admin-Key') || 
                     url.searchParams.get('key') || 
                     url.searchParams.get('secret');

  if (!configuredSecret || !authHeader || !timingSafeEqual(String(authHeader), String(configuredSecret).trim())) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': 'null' }
    });
  }

  const isSet = !!env.BOT_TOKEN;
  const hasChat = !!env.CHAT_ID;
  const hasSecret = !!env.SECRET_TOKEN;

  let tgMe = null;
  let webhookInfo = null;

  if (isSet) {
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`);
      if (meRes.ok) tgMe = await meRes.json();

      const hookRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
      if (hookRes.ok) webhookInfo = await hookRes.json();
    } catch (e) {
      console.error('Telegram API test failed:', e);
    }
  }

  return new Response(JSON.stringify({
    configured: isSet,
    hasChatId: hasChat,
    hasSecretToken: hasSecret,
    bot: tgMe?.result || null,
    webhook: webhookInfo?.result || null,
    worker_url: url.origin
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': 'null' }
  });
}

export async function handleFileDownload(fileKey, env) {
  if (!env.BOT_TOKEN) return new Response('Bot Token Not Configured', { status: 500 });
  const fileId = decodeURIComponent(fileKey);

  let fileMeta = null;
  if (env.FILES_KV) {
    fileMeta = await env.FILES_KV.get(fileId, { type: 'json' }).catch(() => null);
    if (!fileMeta) {
      const list = await env.FILES_KV.list({ limit: 500 });
      for (const k of list.keys) {
        if (k.name === 'AI_DOCS_CATEGORIES' || k.name === 'AI_CRON_STATUS' || k.name === 'STATIC_TITLE_OVERRIDES') continue;
        const val = await env.FILES_KV.get(k.name, { type: 'json' }).catch(() => null);
        if (val && (val.file_id === fileId || val.id === fileId)) {
          fileMeta = val;
          break;
        }
      }
    }
  }

  // Strictly require file record to exist in FILES_KV to prevent open Telegram file proxying
  if (!fileMeta || !fileMeta.file_id) {
    return new Response('File Not Found or Unauthorized', { status: 404 });
  }

  const tgFileId = fileMeta.file_id;
  const pathReq = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(tgFileId)}`);
  if (!pathReq.ok) return new Response('File Not Found on Telegram', { status: 404 });
  const pathData = await pathReq.json();
  if (!pathData.ok || !pathData.result?.file_path) return new Response('TG File Error', { status: 502 });

  const filePath = pathData.result.file_path;
  const fileResp = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`);
  if (!fileResp.ok) return new Response('Download Stream Error', { status: fileResp.status });

  const ext = filePath.split('.').pop() || 'bin';
  const originalName = fileMeta?.file_name || fileMeta?.title || '';
  const filename = originalName ? (originalName.includes('.') ? originalName : `${originalName}.${ext}`) : (filePath.split('/').pop() || `file.${ext}`);

  const newHeaders = new Headers(fileResp.headers);
  const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
  newHeaders.set('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
  newHeaders.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  const extLower = ext.toLowerCase();
  if (extLower === 'pdf') newHeaders.set('Content-Type', 'application/pdf');
  else if (extLower === 'html' || extLower === 'htm') {
    newHeaders.set('Content-Type', 'text/html; charset=utf-8');
    newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:;");
  }
  else if (extLower === 'txt') newHeaders.set('Content-Type', 'text/plain; charset=utf-8');
  else if (extLower === 'svg') newHeaders.set('Content-Type', 'image/svg+xml');
  else if (extLower === 'docx') newHeaders.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  else if (extLower === 'zip') newHeaders.set('Content-Type', 'application/zip');
  else if (['mp3', 'm4a', 'ogg', 'wav'].includes(extLower)) newHeaders.set('Content-Type', `audio/${extLower === 'mp3' ? 'mpeg' : extLower}`);
  else if (['mp4', 'webm', 'mov'].includes(extLower)) newHeaders.set('Content-Type', `video/${extLower}`);
  else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extLower)) newHeaders.set('Content-Type', `image/${extLower === 'jpg' ? 'jpeg' : extLower}`);

  return new Response(fileResp.body, { status: fileResp.status, headers: newHeaders });
}

// ============================================================================
//  MAIN TELEGRAM WEBHOOK CONTROLLER
// ============================================================================

export async function handleTelegramWebhook(request, env) {
  try {
    const secretToken = env.SECRET_TOKEN ? String(env.SECRET_TOKEN).trim() : '';
    if (secretToken) {
      const headerToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
      if (!timingSafeEqual(headerToken, secretToken)) {
        console.warn('Rejected webhook: invalid secret token header.');
        return new Response('Unauthorized', { status: 403 });
      }
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const update = await request.json().catch(() => null);
    if (!update) return new Response('OK');

    // 1. Handle Inline Button Callbacks
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || '';
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;

      const ownerId = String(env.CHAT_ID || '').trim();
      const senderId = String(cb.from?.id || '').trim();
      const cbChatId = String(chatId || '').trim();

      // Fail closed: ownerId must be defined and match sender
      const isOwner = !!ownerId && (senderId === ownerId || cbChatId === ownerId);
      if (!isOwner) {
        await answerCallback(env, cb.id, '⛔️ دسترسی غیرمجاز', true);
        return new Response('OK');
      }

      if (data === 'noop') {
        await answerCallback(env, cb.id);
        return new Response('OK');
      }

      // --- MENU NAVIGATION & STATS ---
      if (data === 'menu:home') {
        if (env.FILES_KV) {
          await env.FILES_KV.delete(`ADMIN_STATE_${chatId}`).catch(() => {});
        }
        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, '🤖 **پنل مدیریت وب‌سایت**\n\nلطفاً یکی از بخش‌های زیر را انتخاب کنید:', getMainMenuKeyboard());
        return new Response('OK');
      }

      // --- ADD CONTENT WIZARDS ---
      if (data === 'add:note') {
        if (env.FILES_KV) {
          await env.FILES_KV.put(`ADMIN_STATE_${chatId}`, JSON.stringify({ action: 'add_note', time: Date.now() }), { expirationTtl: 600 });
        }
        await answerCallback(env, cb.id);
        const promptText =
          `📥 **حالت افزودن مستند / فایل فعال شد!**\n\n` +
          `محتوای شما در بخش **«📚 پایگاه دانش و مستندات»** قرار می‌گیرد:\n\n` +
          `۱. **ارسال فایل:** فایل HTML، PDF، صوت یا ویدیوی خود را همین الان بفرستید.\n` +
          `۲. **ارسال متن:** متن مستند یا خلاصه مبحث را ارسال فرمایید.\n\n` +
          `✨ *محتوا بلافاصله در بخش مستندات و مقالات سایت منتشر می‌شود.*`;

        await editTgText(env, chatId, messageId, promptText, {
          inline_keyboard: [
            [{ text: '❌ لغو و بازگشت به منوی اصلی', callback_data: 'add:cancel' }]
          ]
        });
        return new Response('OK');
      }

      if (data === 'add:article') {
        if (env.FILES_KV) {
          await env.FILES_KV.put(`ADMIN_STATE_${chatId}`, JSON.stringify({ action: 'add_article', time: Date.now() }), { expirationTtl: 600 });
        }
        await answerCallback(env, cb.id);
        const promptText =
          `✍️ **حالت افزودن یادداشت فعال شد!**\n\n` +
          `مطلب شما در بخش **«📝 یادداشت‌ها»** صفحه سایت منتشر می‌شود:\n\n` +
          `۱. **ارسال متن یادداشت:** متن را بنویسید (سطر اول عنوان یادداشت خواهد بود).\n` +
          `۲. **ارسال فایل متنی:** فایل متنی یا HTML یادداشت را بفرستید.\n\n` +
          `✨ *یادداشت شما در بخش یادداشت‌ها و مقالات سایت منتشر می‌شود.*`;

        await editTgText(env, chatId, messageId, promptText, {
          inline_keyboard: [
            [{ text: '❌ لغو و بازگشت به منوی اصلی', callback_data: 'add:cancel' }]
          ]
        });
        return new Response('OK');
      }

      if (data === 'add:cancel') {
        if (env.FILES_KV) {
          await env.FILES_KV.delete(`ADMIN_STATE_${chatId}`).catch(() => {});
        }
        await answerCallback(env, cb.id, 'عملیات لغو شد.');
        await editTgText(env, chatId, messageId, '🤖 **پنل مدیریت وب‌سایت**\n\nلطفاً یکی از بخش‌های زیر را انتخاب کنید:', getMainMenuKeyboard());
        return new Response('OK');
      }

      if (data === 'menu:stats') {
        let fileCount = 0, qaCount = 0, orderCount = 0;
        try {
          const allMats = await getAllSiteMaterials(env);
          fileCount = allMats.length;
        } catch (e) { }

        if (env.CONTACT_KV) {
          try {
            const contactList = await env.CONTACT_KV.list({ limit: 1000 });
            const contactKeys = contactList.keys || [];
            qaCount = contactKeys.filter(k => k.name.startsWith('qa_')).length;
            orderCount = contactKeys.filter(k => k.name.startsWith('order_')).length;
          } catch (e) { }
        }

        const statsText =
          `📊 **داشبورد و آمار زندهٔ وب‌سایت**\n\n` +
          `📁 مجموع مستندات و فایل‌ها: **${fileCount}**\n` +
          `🛒 سفارش‌های همکاری: **${orderCount}**\n` +
          `💬 پرسش و پاسخ‌ها: **${qaCount}**`;

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, statsText, {
          inline_keyboard: [
            [
              { text: '🔄 به‌روزرسانی آمار', callback_data: 'menu:stats' },
              { text: '📁 مستندات و مقالات', callback_data: 'menu:files' }
            ],
            [
              { text: '📢 بنر اطلاعیه', callback_data: 'menu:announce' },
              { text: '💡 واژه روز', callback_data: 'menu:word' }
            ],
            [
              { text: '🛒 سفارش‌ها', callback_data: 'menu:orders' },
              { text: '💬 پرسش و پاسخ', callback_data: 'menu:qas' }
            ],
            [
              { text: '⚡️ وضعیت سلامت زیرساخت', callback_data: 'menu:sys_status' },
              { text: '🔙 بازگشت به منو', callback_data: 'menu:home' }
            ]
          ]
        });
        return new Response('OK');
      }

      if (data === 'menu:sys_status') {
        const hasFilesKv = !!env.FILES_KV;
        const hasContactKv = !!env.CONTACT_KV;
        const hasGemini = !!env.GEMINI_API_KEY;
        const hasBotToken = !!env.BOT_TOKEN;
        const hasChatId = !!env.CHAT_ID;

        let filesKvItems = 0;
        let contactKvItems = 0;

        if (hasFilesKv) {
          try {
            const list = await env.FILES_KV.list({ limit: 1000 });
            filesKvItems = (list.keys || []).length;
          } catch (e) { filesKvItems = -1; }
        }
        if (hasContactKv) {
          try {
            const list = await env.CONTACT_KV.list({ limit: 1000 });
            contactKvItems = (list.keys || []).length;
          } catch (e) { contactKvItems = -1; }
        }

        const sysReport =
          `⚡️ **گزارش سلامت و وضعیت زیرساخت وب‌سایت**\n\n` +
          `📦 **وضعیت حافظه‌های KV Cloudflare:**\n` +
          `• FILES_KV: ${hasFilesKv ? (filesKvItems >= 0 ? `🟢 متصل (${filesKvItems} کلید)` : '⚠️ خطای خواندن') : '🔴 نامتصل'}\n` +
          `• CONTACT_KV: ${hasContactKv ? (contactKvItems >= 0 ? `🟢 متصل (${contactKvItems} کلید)` : '⚠️ خطای خواندن') : '🔴 نامتصل'}\n\n` +
          `🔑 **پیکربندی هوش مصنوعی و ربات:**\n` +
          `• هوش مصنوعی Gemini: ${hasGemini ? '🟢 فعال' : '🔴 نامعتبر/تنظیم نشده'}\n` +
          `• توکن ربات تلگرام: ${hasBotToken ? '🟢 فعال' : '🔴 نامعتبر'}\n` +
          `• شناسه مدیر (CHAT_ID): ${hasChatId ? `🟢 ثبت شده (\`${env.CHAT_ID}\`)` : '⚠️ عمومی'}\n\n` +
          `⏰ زمان سرور: ${new Date().toISOString()}`;

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, sysReport, {
          inline_keyboard: [
            [{ text: '🔄 بررسی مجدد', callback_data: 'menu:sys_status' }],
            [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'menu:home' }]
          ]
        });
        return new Response('OK');
      }

      // --- ANNOUNCEMENT BANNER ---
      if (data === 'menu:announce') {
        const announceData = env.CONTACT_KV ? await env.CONTACT_KV.get('SITE_ANNOUNCEMENT', { type: 'json' }) : null;
        const isActive = !!(announceData && announceData.active && announceData.text);
        const currentText = isActive ? `«${announceData.text}»` : 'در حال حاضر بنر اطلاعیه‌ای فعال نیست.';

        const text =
          `📢 **مدیریت بنر اطلاعیه بالای سایت**\n\n` +
          `وضعیت فعلی: ${isActive ? '🟢 فعال و در حال نمایش' : '⚪️ غیرفعال'}\n` +
          `متن کنونی:\n${currentText}\n\n` +
          `💡 برای تنظیم یا تغییر اطلاعیه، دستور زیر را به ربات بفرستید:\n` +
          `\`/announce متن اطلاعیه شما\`\n\n` +
          `یا برای حذف آنی از دکمه زیر استفاده کنید:`;

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, text, {
          inline_keyboard: [
            isActive ? [{ text: '🚫 حذف و خاموش کردن بنر', callback_data: 'announce:clear' }] : [],
            [{ text: '🔙 بازگشت به منو', callback_data: 'menu:home' }]
          ].filter(r => r.length > 0)
        });
        return new Response('OK');
      }

      if (data === 'announce:clear') {
        if (env.CONTACT_KV) {
          await env.CONTACT_KV.delete('SITE_ANNOUNCEMENT');
        }
        await answerCallback(env, cb.id, 'بنر اطلاعیه حذف شد.');
        await editTgText(env, chatId, messageId, '✅ بنر اطلاعیه از بالای سایت برداشته و غیرفعال شد.', {
          inline_keyboard: [[{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]]
        });
        return new Response('OK');
      }

      // --- WORD OF THE DAY (WotD) ---
      if (data === 'menu:word') {
        const customWord = env.CONTACT_KV ? await env.CONTACT_KV.get('DAILY_WORD_OVERRIDE', { type: 'json' }) : null;
        const isCustom = !!(customWord && customWord.word);

        let curWordDisplay = '';
        if (isCustom) {
          curWordDisplay =
            `🌟 کلمه: **${customWord.word}** (${customWord.type || 'adj'})\n` +
            `🗣 تلفظ: \`${customWord.pron || '—'}\`\n` +
            `📖 معنی: **${customWord.meaning}**\n` +
            `📝 مثال: _${customWord.example || '—'}_\n` +
            `🇮🇷 ترجمه: ${customWord.example_fa || '—'}\n` +
            `💡 نکته: ${customWord.tip || '—'}`;
        } else {
          curWordDisplay = '🔄 هم‌اکنون واژگان روزانه به صورت خودکار از تقویم چرخش واژگان انتخاب می‌شوند.';
        }

        const text =
          `💡 **مدیریت واژهٔ روز (Word of the Day)**\n\n` +
          `وضعیت: ${isCustom ? '🎨 سفارشی (تنظیم دستی / هوش مصنوعی)' : '🔄 چرخش تقویمی خودکار'}\n\n` +
          `${curWordDisplay}\n\n` +
          `👇 برای خلق واژه جدید با هوش مصنوعی یا بازنشانی از دکمه‌های زیر استفاده کنید:`;

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, text, {
          inline_keyboard: [
            [
              { text: '🎲 تولید واژه جدید با هوش مصنوعی (AI)', callback_data: 'word:new_ai' }
            ],
            isCustom ? [
              { text: '🔄 بازنشانی به چرخش عادی روزانه', callback_data: 'word:reset_default' }
            ] : [],
            [
              { text: '🔙 بازگشت به منو', callback_data: 'menu:home' }
            ]
          ].filter(r => r.length > 0)
        });
        return new Response('OK');
      }

      if (data === 'word:new_ai') {
        await answerCallback(env, cb.id, '🤖 در حال تولید واژه تخصصی با هوش مصنوعی...');
        try {
          const aiWord = await generateAiDailyWord(env);
          if (env.CONTACT_KV) {
            await env.CONTACT_KV.put('DAILY_WORD_OVERRIDE', JSON.stringify(aiWord));
          }
          const successText =
            `✨ **واژهٔ روز جدید با موفقیت تولید و در سایت ثبت شد!**\n\n` +
            `🌟 کلمه: **${aiWord.word}** (${aiWord.type})\n` +
            `🗣 تلفظ: \`${aiWord.pron}\`\n` +
            `📖 معنی: **${aiWord.meaning}**\n\n` +
            `📝 مثال: _${aiWord.example}_\n` +
            `🇮🇷 ترجمه: ${aiWord.example_fa}\n\n` +
            `💡 نکته: ${aiWord.tip}`;

          await editTgText(env, chatId, messageId, successText, {
            inline_keyboard: [
              [{ text: '🎲 تولید یکی دیگر با AI', callback_data: 'word:new_ai' }],
              [{ text: '🔄 بازنشانی به چرخش عادی', callback_data: 'word:reset_default' }],
              [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
            ]
          });
        } catch (e) {
          console.error('word:new_ai error:', e);
          await answerCallback(env, cb.id, 'خطا در ارتباط با هوش مصنوعی', true);
        }
        return new Response('OK');
      }

      if (data === 'word:reset_default') {
        if (env.CONTACT_KV) {
          await env.CONTACT_KV.delete('DAILY_WORD_OVERRIDE');
        }
        await answerCallback(env, cb.id, 'چرخش خودکار روزانه فعال شد.');
        await editTgText(env, chatId, messageId, '✅ واژهٔ روز با موفقیت به تقویم چرخش عادی بازنشانی شد.', {
          inline_keyboard: [[{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]]
        });
        return new Response('OK');
      }

      // --- ORDERS MANAGEMENT ---
      if (data === 'menu:orders' || data.startsWith('menu:orders:page:')) {
        let page = 1;
        if (data.startsWith('menu:orders:page:')) {
          page = parseInt(data.replace('menu:orders:page:', ''), 10) || 1;
        }

        let orders = [];
        if (env.CONTACT_KV) {
          const list = await env.CONTACT_KV.list({ limit: 1000 });
          const orderKeys = (list.keys || []).filter(k => k.name.startsWith('order_'));
          orders = await Promise.all(orderKeys.map(async k => {
            const item = await env.CONTACT_KV.get(k.name, { type: 'json' }).catch(() => null);
            if (item) item._key = k.name;
            return item;
          }));
          orders = orders.filter(Boolean).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        if (orders.length === 0) {
          await answerCallback(env, cb.id);
          await editTgText(env, chatId, messageId, '🛒 هیچ سفارش همکاری در دیتابیس ثبت نشده است.', {
            inline_keyboard: [[{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]]
          });
          return new Response('OK');
        }

        const pageSize = 4;
        const totalPages = Math.ceil(orders.length / pageSize);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const currentOrders = orders.slice((page - 1) * pageSize, page * pageSize);

        let text = `🛒 **لیست سفارش‌های همکاری (صفحه ${page} از ${totalPages}):**\n\n`;
        const keyboard = [];

        currentOrders.forEach((o, i) => {
          const idx = (page - 1) * pageSize + i + 1;
          const timeStr = o.timestamp ? new Date(o.timestamp).toLocaleDateString('fa-IR') : '—';
          text +=
            `🔹 **${idx}. ${o.name || 'بدون نام'}**\n` +
            `📞 ارتباط: \`${o.contact || '—'}\`\n` +
            `🧩 خدمت: ${o.service || '—'} | 💰 بودجه: ${o.budget || '—'}\n` +
            `⏳ مهلت: ${o.deadline || '—'} | 📅 تاریخ: ${timeStr}\n` +
            `📝 توضیحات: ${o.details?.slice(0, 100) || '—'}\n\n`;

          keyboard.push([
            { text: `🗑 حذف سفارش ${o.name?.slice(0, 14) || 'مورد'}`, callback_data: `ordel:${o._key || o.id}` }
          ]);
        });

        const navRow = [];
        if (page > 1) {
          navRow.push({ text: '◀️ صفحه قبل', callback_data: `menu:orders:page:${page - 1}` });
        }
        if (page < totalPages) {
          navRow.push({ text: 'صفحه بعد ▶️', callback_data: `menu:orders:page:${page + 1}` });
        }
        if (navRow.length > 0) keyboard.push(navRow);

        keyboard.push([{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]);

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, text, { inline_keyboard: keyboard });
        return new Response('OK');
      }

      if (data.startsWith('ordel:')) {
        const orderKey = data.substring(6);
        if (env.CONTACT_KV) {
          await env.CONTACT_KV.delete(orderKey);
          if (!orderKey.startsWith('order_')) {
            await env.CONTACT_KV.delete(`order_${orderKey}`);
          }
        }
        await answerCallback(env, cb.id, '🗑 سفارش با موفقیت حذف شد.');
        await editTgText(env, chatId, messageId, `✅ سفارش انتخاب‌شده با موفقیت حذف گردید.`, {
          inline_keyboard: [
            [{ text: '🛒 مشاهده لیست سفارش‌ها', callback_data: 'menu:orders' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
          ]
        });
        return new Response('OK');
      }

      // --- Q&A MANAGEMENT ---
      if (data === 'menu:qas' || data.startsWith('menu:qas:page:')) {
        let page = 1;
        if (data.startsWith('menu:qas:page:')) {
          page = parseInt(data.replace('menu:qas:page:', ''), 10) || 1;
        }

        let qas = [];
        if (env.CONTACT_KV) {
          const list = await env.CONTACT_KV.list({ limit: 1000 });
          const qaKeys = (list.keys || []).filter(k => k.name.startsWith('qa_'));
          qas = await Promise.all(qaKeys.map(async k => {
            const item = await env.CONTACT_KV.get(k.name, { type: 'json' }).catch(() => null);
            if (item) item._key = k.name;
            return item;
          }));
          qas = qas.filter(Boolean).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        if (qas.length === 0) {
          await answerCallback(env, cb.id);
          await editTgText(env, chatId, messageId, '💬 هیچ سوالی در دیتابیس ثبت نشده است.', {
            inline_keyboard: [[{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]]
          });
          return new Response('OK');
        }

        const pageSize = 3;
        const totalPages = Math.ceil(qas.length / pageSize);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const currentQas = qas.slice((page - 1) * pageSize, page * pageSize);

        let text = `💬 **مدیریت پرسش و پاسخ‌ها (صفحه ${page} از ${totalPages}):**\n\n`;
        const keyboard = [];

        currentQas.forEach((q, i) => {
          const idx = (page - 1) * pageSize + i + 1;
          const isAns = !!q.reply_text;
          const isPub = !!q.isPublic;

          text +=
            `❓ **${idx}. ${q.name || 'کاربر'}:**\n«${q.message || '—'}»\n` +
            `وضعیت: ${isAns ? '✅ پاسخ داده شده' : '⏳ در انتظار پاسخ'} | انتشار در سایت: ${isPub ? '🟢 عمومی' : '⚪️ مخفی'}\n` +
            (isAns ? `💬 پاسخ: «${q.reply_text.slice(0, 80)}...»\n` : '') +
            `🆔 \`${q.id || q._key}\`\n\n`;

          keyboard.push([
            { text: `💬 پاسخ`, callback_data: `qans:${q.id || q._key}` },
            { text: isPub ? '👁 مخفی کردن' : '🌐 انتشار در سایت', callback_data: `qpub:${q.id || q._key}` },
            { text: '🗑 حذف', callback_data: `qdel:${q.id || q._key}` }
          ]);
        });

        const navRow = [];
        if (page > 1) {
          navRow.push({ text: '◀️ صفحه قبل', callback_data: `menu:qas:page:${page - 1}` });
        }
        if (page < totalPages) {
          navRow.push({ text: 'صفحه بعد ▶️', callback_data: `menu:qas:page:${page + 1}` });
        }
        if (navRow.length > 0) keyboard.push(navRow);

        keyboard.push([{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]);

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, text, { inline_keyboard: keyboard });
        return new Response('OK');
      }

      if (data.startsWith('qpub:')) {
        const qaId = data.substring(5);
        if (env.CONTACT_KV) {
          let record = await env.CONTACT_KV.get(qaId, { type: 'json' });
          if (!record && !qaId.startsWith('qa_')) {
            record = await env.CONTACT_KV.get(`qa_${qaId}`, { type: 'json' });
          }
          if (record) {
            record.isPublic = !record.isPublic;
            const targetKey = qaId.startsWith('qa_') ? qaId : `qa_${qaId}`;
            await env.CONTACT_KV.put(targetKey, JSON.stringify(record));
            await answerCallback(env, cb.id, record.isPublic ? '🟢 در سایت منتشر شد.' : '⚪️ از سایت برداشته شد.');
            await editTgText(env, chatId, messageId, `وضعیت انتشار سوال «${record.name}» تغییر کرد: ${record.isPublic ? '🟢 منتشر در سایت' : '⚪️ مخفی'}`, {
              inline_keyboard: [
                [{ text: '💬 بازگشت به لیست سوالات', callback_data: 'menu:qas' }],
                [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
              ]
            });
            return new Response('OK');
          }
        }
        await answerCallback(env, cb.id, 'مورد یافت نشد', true);
        return new Response('OK');
      }

      if (data.startsWith('qdel:')) {
        const qaId = data.substring(5);
        if (env.CONTACT_KV) {
          await env.CONTACT_KV.delete(qaId);
          if (!qaId.startsWith('qa_')) {
            await env.CONTACT_KV.delete(`qa_${qaId}`);
          }
        }
        await answerCallback(env, cb.id, '🗑 سوال حذف شد.');
        await editTgText(env, chatId, messageId, '✅ پرسش مورد نظر با موفقیت حذف گردید.', {
          inline_keyboard: [
            [{ text: '💬 بازگشت به لیست سوالات', callback_data: 'menu:qas' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
          ]
        });
        return new Response('OK');
      }

      if (data.startsWith('qans:')) {
        const qaId = data.substring(5);
        await answerCallback(env, cb.id);
        const replyInstruction =
          `📝 **پاسخ به سوال:**\n\n` +
          `برای ارسال پاسخ به این پرسش، دستور زیر را کپی و متن پاسخ خود را بنویسید:\n\n` +
          `\`/reply_qa ${qaId} متن پاسخ شما به این سوال\``;
        await editTgText(env, chatId, messageId, replyInstruction, {
          inline_keyboard: [
            [{ text: '💬 بازگشت به لیست سوالات', callback_data: 'menu:qas' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
          ]
        });
        return new Response('OK');
      }

      // --- DOCUMENTS & FILES MANAGEMENT ---
      if (data === 'menu:notes' || data.startsWith('menu:notes:page:')) {
        let page = 1;
        if (data.startsWith('menu:notes:page:')) {
          page = parseInt(data.replace('menu:notes:page:', ''), 10) || 1;
        }

        const materials = await getAllSiteMaterials(env);
        const notes = materials.filter(m => m.is_document && !m.is_article);

        if (notes.length === 0) {
          await answerCallback(env, cb.id);
          await editTgText(env, chatId, messageId, '📚 هیچ مستند یا فایلی در کتابخانه ثبت نشده است.\n\n👇 می‌توانید همین الان اولین مستند یا فایل را اضافه کنید:', {
            inline_keyboard: [
              [{ text: '➕ افزودن مستند / فایل', callback_data: 'add:note' }],
              [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
            ]
          });
          return new Response('OK');
        }

        const pageSize = 5;
        const totalPages = Math.ceil(notes.length / pageSize);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const currentItems = notes.slice((page - 1) * pageSize, page * pageSize);

        let text = `📚 **مدیریت مستندات و فایل‌های سایت (صفحه ${page} از ${totalPages}):**\n\n`;
        const keyboard = [
          [{ text: '➕ افزودن مستند و فایل جدید (HTML / PDF / مدیا)', callback_data: 'add:note' }]
        ];

        currentItems.forEach((m, i) => {
          const idx = (page - 1) * pageSize + i + 1;
          const titleShort = (m.title || m.file_name || 'مستند بدون عنوان').slice(0, 32);
          text += `${idx}. 📚 **${titleShort}**\n   🏷 دسته‌بندی: ${m.category || 'عمومی'}\n\n`;

          keyboard.push([
            { text: `⚙️ مدیریت «${titleShort}»`, callback_data: `v:${m.id}` }
          ]);
        });

        const navRow = [];
        if (page > 1) {
          navRow.push({ text: '◀️ صفحه قبل', callback_data: `menu:notes:page:${page - 1}` });
        }
        if (page < totalPages) {
          navRow.push({ text: 'صفحه بعد ▶️', callback_data: `menu:notes:page:${page + 1}` });
        }
        if (navRow.length > 0) keyboard.push(navRow);

        keyboard.push([
          { text: '🤖 دسته‌بندی دسته‌ای با هوش مصنوعی', callback_data: 'batch:ai' }
        ]);
        keyboard.push([
          { text: '🔙 منوی اصلی', callback_data: 'menu:home' }
        ]);

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, text, { inline_keyboard: keyboard });
        return new Response('OK');
      }

      // --- ARTICLES & NOTES MANAGEMENT ---
      if (data === 'menu:articles' || data.startsWith('menu:articles:page:')) {
        let page = 1;
        if (data.startsWith('menu:articles:page:')) {
          page = parseInt(data.replace('menu:articles:page:', ''), 10) || 1;
        }

        const materials = await getAllSiteMaterials(env);
        const articles = materials.filter(m => m.is_article || m.type === 'post' || m.type === 'article');

        if (articles.length === 0) {
          await answerCallback(env, cb.id);
          const emptyText =
            `📝 **بخش یادداشت‌های وب‌سایت**\n\n` +
            `در حال حاضر هیچ یادداشتی در سایت ثبت نشده است.\n\n` +
            `👇 می‌توانید همین الان اولین یادداشت را اضافه کنید:`;

          await editTgText(env, chatId, messageId, emptyText, {
            inline_keyboard: [
              [{ text: '➕ افزودن یادداشت جدید', callback_data: 'add:article' }],
              [{ text: '📚 مشاهده مستندات و فایل‌ها', callback_data: 'menu:notes' }],
              [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'menu:home' }]
            ]
          });
          return new Response('OK');
        }

        const pageSize = 5;
        const totalPages = Math.ceil(articles.length / pageSize);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const currentItems = articles.slice((page - 1) * pageSize, page * pageSize);

        let text = `📝 **مدیریت یادداشت‌های سایت (صفحه ${page} از ${totalPages}):**\n\n`;
        const keyboard = [
          [{ text: '➕ افزودن یادداشت جدید', callback_data: 'add:article' }]
        ];

        currentItems.forEach((m, i) => {
          const idx = (page - 1) * pageSize + i + 1;
          const titleShort = (m.title || m.file_name || 'یادداشت بدون عنوان').slice(0, 32);
          const dateStr = m.timestamp ? new Date(m.timestamp).toLocaleDateString('fa-IR') : 'سیستم سایت';
          text += `${idx}. 📝 **${titleShort}**\n   🏷 دسته‌بندی: ${m.category || 'عمومی'} | 📅 ${dateStr}\n\n`;

          keyboard.push([
            { text: `⚙️ مدیریت «${titleShort}»`, callback_data: `v:${m.id}` }
          ]);
        });

        const navRow = [];
        if (page > 1) {
          navRow.push({ text: '◀️ صفحه قبل', callback_data: `menu:articles:page:${page - 1}` });
        }
        if (page < totalPages) {
          navRow.push({ text: 'صفحه بعد ▶️', callback_data: `menu:articles:page:${page + 1}` });
        }
        if (navRow.length > 0) keyboard.push(navRow);

        keyboard.push([
          { text: '🔙 منوی اصلی', callback_data: 'menu:home' }
        ]);

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, text, { inline_keyboard: keyboard });
        return new Response('OK');
      }

      if (data === 'help:article') {
        const guide =
          `📝 **راهنمای انتشار مقاله و یادداشت در وب‌سایت:**\n\n` +
          `برای انتشار مقاله در بخش یادداشت‌ها:\n\n` +
          `۱. **استفاده از دکمه «➕ افزودن مقاله جدید»** در منو و ارسال مستقیم متن یا فایل.\n` +
          `۲. **ارسال مستقیم متن با هشتگ #مقاله:**\n` +
          `\`#مقاله عنوان مقاله شما\nمتن کامل مقاله...\`\n\n` +
          `۳. **تبدیل مستندات به مقاله:**\n` +
          `از منوی «📚 مستندات و فایل‌ها» هر فایلی را باز کرده و دکمهٔ «📝 مقاله و یادداشت» را بزنید.`;

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, guide, {
          inline_keyboard: [
            [{ text: '➕ افزودن مقاله جدید', callback_data: 'add:article' }],
            [{ text: '📝 مشاهده مقالات فعلی', callback_data: 'menu:articles' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
          ]
        });
        return new Response('OK');
      }

      // --- MATERIALS / FILES LIST & PAGINATION ---
      if (data === 'menu:files' || data.startsWith('menu:files:page:')) {
        let page = 1;
        if (data.startsWith('menu:files:page:')) {
          page = parseInt(data.replace('menu:files:page:', ''), 10) || 1;
        }

        const materials = await getAllSiteMaterials(env);

        if (materials.length === 0) {
          await answerCallback(env, cb.id);
          await editTgText(env, chatId, messageId, '📁 هیچ فایلی در وب‌سایت ثبت نشده است.\n\n👇 می‌توانید همین الان فایل جدید اضافه کنید:', {
            inline_keyboard: [
              [{ text: '➕ آپلود فایل جدید', callback_data: 'add:note' }],
              [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
            ]
          });
          return new Response('OK');
        }

        const pageSize = 5;
        const totalPages = Math.ceil(materials.length / pageSize);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const currentItems = materials.slice((page - 1) * pageSize, page * pageSize);

        let text = `📁 **مدیریت کلیه مستندات، فایل‌ها و مقالات (صفحه ${page} از ${totalPages}):**\n\n`;
        const keyboard = [
          [{ text: '➕ افزودن مستند / فایل جدید', callback_data: 'add:note' }]
        ];

        currentItems.forEach((m, i) => {
          const idx = (page - 1) * pageSize + i + 1;
          const typeIcon = m.is_article ? '📝' : (m.is_file ? '📎' : '📚');
          const titleShort = (m.title || m.file_name || 'فایل بدون عنوان').slice(0, 32);
          text += `${idx}. ${typeIcon} **${titleShort}**\n   🏷 دسته‌بندی: ${m.category || 'عمومی'}\n\n`;

          keyboard.push([
            { text: `⚙️ مدیریت «${titleShort}»`, callback_data: `v:${m.id}` }
          ]);
        });

        const navRow = [];
        if (page > 1) {
          navRow.push({ text: '◀️ صفحه قبل', callback_data: `menu:files:page:${page - 1}` });
        }
        if (page < totalPages) {
          navRow.push({ text: 'صفحه بعد ▶️', callback_data: `menu:files:page:${page + 1}` });
        }
        if (navRow.length > 0) keyboard.push(navRow);

        keyboard.push([
          { text: '🤖 دسته‌بندی دسته‌ای با هوش مصنوعی', callback_data: 'batch:ai' }
        ]);
        keyboard.push([
          { text: '🔙 منوی اصلی', callback_data: 'menu:home' }
        ]);

        await answerCallback(env, cb.id);
        await editTgText(env, chatId, messageId, text, { inline_keyboard: keyboard });
        return new Response('OK');
      }

      // --- VIEW INDIVIDUAL MATERIAL ---
      if (data.startsWith('v:')) {
        const itemId = data.substring(2);
        const match = await findFileRecord(env, itemId);
        if (match) {
          const m = match.data;
          const typeStr = m.is_article ? '📝 مقاله و یادداشت' : '📚 مستند و راهنما';
          const fileInfo = match.isStatic ? 'استاتیک (سیستم سایت)' : (m.file_name ? `فایل تلگرام (${m.file_name})` : 'پست متنی');

          const detailText =
            `⚙️ **مدیریت مطلب:**\n\n` +
            `📌 **عنوان:** «${m.title}»\n` +
            `🏷 **دسته‌بندی فعلی:** ${m.category || 'عمومی'}\n` +
            `📂 **نوع محتوا:** ${typeStr}\n` +
            `📦 **منبع:** ${fileInfo}\n\n` +
            `👇 برای تغییر دسته‌بندی یا مشخصات از کلیدهای زیر استفاده کنید:`;

          await answerCallback(env, cb.id);
          await editTgText(env, chatId, messageId, detailText, getCategoryKeyboard(itemId, m.category, m.is_document, m.is_article, match.isStatic));
        } else {
          await answerCallback(env, cb.id, 'مورد مورد نظر یافت نشد.', true);
        }
        return new Response('OK');
      }

      // --- TOGGLE TYPE (DOCUMENT vs ARTICLE) ---
      if (data.startsWith('t:')) {
        const parts = data.split(':');
        const itemId = parts[1];
        const targetType = parts[2]; // 's' for document, 'a' for article

        const match = await findFileRecord(env, itemId);
        if (match) {
          const isDocument = targetType === 's';
          const isArticle = targetType === 'a';

          if (match.isStatic) {
            match.data.is_document = isDocument;
            match.data.is_article = isArticle;
            match.data.type = isArticle ? 'article' : 'document';
            if (env.FILES_KV) {
              try {
                const rawTypes = await env.FILES_KV.get('STATIC_TYPE_OVERRIDES').catch(() => null);
                const typesObj = rawTypes ? JSON.parse(rawTypes) : {};
                typesObj[match.staticFile] = isArticle ? 'article' : 'document';
                await env.FILES_KV.put('STATIC_TYPE_OVERRIDES', JSON.stringify(typesObj));
              } catch (e) { }
            }
          } else if (env.FILES_KV) {
            match.data.is_document = isDocument;
            match.data.is_article = isArticle;
            match.data.type = isArticle ? 'post' : (match.data.file_id ? 'document' : 'document');
            await env.FILES_KV.put(match.key, JSON.stringify(match.data));
          }

          await answerCallback(env, cb.id, `نوع تغییر کرد به: ${isDocument ? '📚 مستند' : '📝 مقاله'}`);
          await editTgText(env, chatId, messageId, `✅ نوع محتوای «${match.data.title}» به ${isDocument ? '📚 مستند و راهنما' : '📝 مقاله و یادداشت'} تغییر یافت.`, getCategoryKeyboard(itemId, match.data.category, isDocument, isArticle, match.isStatic));
        } else {
          await answerCallback(env, cb.id, 'مورد یافت نشد.', true);
        }
        return new Response('OK');
      }

      // --- CHANGE CATEGORY DIRECTLY ---
      if (data.startsWith('c:')) {
        const parts = data.split(':');
        const itemId = parts[1];
        const catCode = parts[2];
        const categoryName = getCategoryByCode(catCode);

        const match = await findFileRecord(env, itemId);
        if (match) {
          if (match.isStatic) {
            if (env.FILES_KV) {
              let aiCategories = {};
              const raw = await env.FILES_KV.get('AI_DOCS_CATEGORIES');
              if (raw) { try { aiCategories = JSON.parse(raw); } catch (e) { } }
              aiCategories[match.staticFile] = categoryName;
              await env.FILES_KV.put('AI_DOCS_CATEGORIES', JSON.stringify(aiCategories));
            }
          } else if (env.FILES_KV) {
            match.data.category = categoryName;
            await env.FILES_KV.put(match.key, JSON.stringify(match.data));
          }

          await answerCallback(env, cb.id, `دسته‌بندی: ${categoryName}`);
          const resMsg = `✅ **دسته‌بندی به‌روزرسانی شد:**\n\n📌 **مطلب:** «${match.data.title}»\n🏷 **دسته‌بندی:** ${categoryName}`;
          await editTgText(env, chatId, messageId, resMsg, getCategoryKeyboard(itemId, categoryName, match.data.is_document, match.data.is_article, match.isStatic));
        } else {
          await answerCallback(env, cb.id, 'مورد یافت نشد.', true);
        }
        return new Response('OK');
      }

      // --- SINGLE ITEM AI CATEGORIZE ---
      if (data.startsWith('ai:')) {
        const itemId = data.substring(3);
        const match = await findFileRecord(env, itemId);
        if (!match) {
          await answerCallback(env, cb.id, 'مورد یافت نشد.', true);
          return new Response('OK');
        }

        await answerCallback(env, cb.id, '🤖 در حال تحلیل ۲۰۰ کلمه اول با هوش مصنوعی...');
        try {
          const rawText = (match.data.title ? match.data.title + '\n' : '') + (match.data.content || match.data.description || match.data.text || '');
          const snippet = getFirstNWords(rawText, 200);

          const catListStr = TG_CATEGORIES.map((c, idx) => `${idx + 1}. ${c.name}`).join('\n');
          const aiPrompt = `You are a content taxonomy AI. Choose the single best category for this article/document from the list below:
${catListStr}

Title: ${match.data.title || 'Unknown'}
Content Snippet (First 200 words):
${snippet}

Respond ONLY with the exact category name.`;

          const rawCategory = await callGemini(aiPrompt, env.GEMINI_API_KEY);
          let assignedCat = (rawCategory || '').trim().replace(/[*_`]/g, '');
          const matchCat = TG_CATEGORIES.find(c => assignedCat.includes(c.short) || assignedCat === c.name);
          if (matchCat) assignedCat = matchCat.name;
          else assignedCat = TG_CATEGORIES[0]?.name || '📁 دسته‌بندی عمومی';

          if (match.isStatic) {
            if (env.FILES_KV) {
              let aiCategories = {};
              const raw = await env.FILES_KV.get('AI_DOCS_CATEGORIES');
              if (raw) { try { aiCategories = JSON.parse(raw); } catch (e) { } }
              aiCategories[match.staticFile] = assignedCat;
              await env.FILES_KV.put('AI_DOCS_CATEGORIES', JSON.stringify(aiCategories));
            }
          } else if (env.FILES_KV) {
            match.data.category = assignedCat;
            await env.FILES_KV.put(match.key, JSON.stringify(match.data));
          }

          const resMsg = `🤖 **هوش مصنوعی دسته‌بندی را تعیین کرد:**\n\n📌 **مطلب:** «${match.data.title}»\n🏷 **دسته‌بندی:** ${assignedCat}\n⚡️ روش: تحلیل ۲۰۰ کلمه اول`;
          await editTgText(env, chatId, messageId, resMsg, getCategoryKeyboard(itemId, assignedCat, match.data.is_document, match.data.is_article, match.isStatic));
        } catch (e) {
          console.error('ai:item error:', e);
          await answerCallback(env, cb.id, 'خطا در ارتباط با هوش مصنوعی', true);
        }
        return new Response('OK');
      }

      // --- RENAME INSTRUCTIONS ---
      if (data.startsWith('rn:')) {
        const itemId = data.substring(3);
        const match = await findFileRecord(env, itemId);
        if (env.FILES_KV) {
          await env.FILES_KV.put(`ADMIN_STATE_${chatId}`, JSON.stringify({ action: 'rename', itemId: itemId, time: Date.now() }), { expirationTtl: 600 });
        }
        await answerCallback(env, cb.id);
        const rnText =
          `✏️ **ویرایش عنوان مطلب:**\n\n` +
          `عنوان فعلی: «${match?.data?.title || itemId}»\n\n` +
          `💡 **عنوان جدید را همین الان به صورت متن بفرستید!**\n` +
          `(یا دستور \`edit:${itemId} عنوان جدید\` را ارسال کنید)`;
        await editTgText(env, chatId, messageId, rnText, {
          inline_keyboard: [
            [{ text: '❌ لغو و بازگشت به مطلب', callback_data: `v:${itemId}` }],
            [{ text: '📁 لیست تمام فایل‌ها', callback_data: 'menu:files' }]
          ]
        });
        return new Response('OK');
      }

      // --- DELETE FILE / NOTE FROM SITE ---
      if (data.startsWith('del:')) {
        const itemId = data.substring(4);
        const match = await findFileRecord(env, itemId);
        if (match) {
          if (match.isStatic) {
            if (env.FILES_KV) {
              const raw = await env.FILES_KV.get('AI_DOCS_CATEGORIES');
              if (raw) { try { aiCategories = JSON.parse(raw); } catch (e) { } }
              aiCategories[match.staticFile] = '❌ حذف شده';
              await env.FILES_KV.put('AI_DOCS_CATEGORIES', JSON.stringify(aiCategories));
            }
          } else if (env.FILES_KV) {
            await env.FILES_KV.delete(match.key);
          }
          await answerCallback(env, cb.id, '🗑 مطلب از وب‌سایت حذف شد.');
          await editTgText(env, chatId, messageId, `✅ مطلب «${match.data.title}» با موفقیت از وب‌سایت حذف گردید.`, {
            inline_keyboard: [
              [{ text: '📁 مشاهده لیست فایل‌ها', callback_data: 'menu:files' }],
              [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
            ]
          });
        } else {
          await answerCallback(env, cb.id, 'مورد یافت نشد.', true);
        }
        return new Response('OK');
      }

      // --- BATCH AI CATEGORIZATION ---
      if (data === 'batch:ai') {
        await answerCallback(env, cb.id, '🤖 در حال دسته‌بندی سریع دسته‌ای با هوش مصنوعی...');
        const res = await processAICategories(env, 15);
        let msgReport = '';
        if (res.processed > 0) {
          msgReport = `✅ **دسته‌بندی هوش مصنوعی انجام شد!**\n\n` +
            `⚡️ روش: تحلیل ۲۰۰ کلمه اول مستندات\n` +
            `📊 تعداد موارد پردازش‌شده: ${res.processed} مورد\n` +
            `⏳ باقیمانده: ${res.remaining} مورد\n\n` +
            `📁 آخرین موارد دسته‌بندی‌شده:\n`;
          (res.processedFiles || []).slice(0, 5).forEach((p, idx) => {
            const t = p.title || p.file || 'مستند';
            msgReport += `${idx + 1}. «${t.slice(0, 30)}» ⬅️ ${p.category}\n`;
          });
        } else if (res.remaining === 0) {
          msgReport = '✨ تمامی مستندات سایت قبلاً توسط هوش مصنوعی دسته‌بندی شده‌اند.';
        } else {
          msgReport = `⚠️ وضعیت: ${res.message || res.lastApiError || 'خطایی رخ داد'}`;
        }
        await editTgText(env, chatId, messageId, msgReport, {
          inline_keyboard: [
            res.remaining > 0 ? [{ text: '⚡️ پردازش ۱۵ مورد بعدی با AI', callback_data: 'batch:ai' }] : [],
            [{ text: '📁 بازگشت به لیست فایل‌ها', callback_data: 'menu:files' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
          ].filter(r => r.length > 0)
        });
        return new Response('OK');
      }
    }

    // 2. Handle Incoming Messages (Text, Files, Commands)
    const msg = update.message;
    if (!msg) return new Response('OK');

    const ownerId = String(env.CHAT_ID || '').trim();
    const senderId = String(msg.from?.id || '').trim();
    const chatId = String(msg.chat?.id || '').trim();

    // Fail closed: ownerId must be defined and match sender
    const isOwner = !!ownerId && (senderId === ownerId || chatId === ownerId);

    if (!isOwner) {
      console.warn(`Unauthorized bot message from senderId=${senderId}, chatId=${chatId}. Configured CHAT_ID=${ownerId}`);
      if (chatId) {
        await sendTg(env, msg.chat.id, `⛔️ دسترسی غیرمجاز.\n\nشناسه کاربری شما: \`${senderId}\`\nشناسه چت: \`${chatId}\`\n\nبرای فعال‌سازی مدیریت، این شناسه را در متغیر CHAT_ID کلاودفلر قرار دهید.`, msg.message_id);
      }
      return new Response('OK');
    }

    // Proactively register bot menu commands in background
    registerBotCommands(env).catch(() => null);

    // Reply to notification
    if (msg.reply_to_message) {
      const replyTxt = msg.reply_to_message.text || msg.reply_to_message.caption || '';
      const match = replyTxt.match(/\[SYSTEM_REF:\s*([a-zA-Z0-9_-]+)\]/i) ||
                    replyTxt.match(/ID:\s*([a-zA-Z0-9_-]+)/i) ||
                    replyTxt.match(/🆔\s*`?([a-zA-Z0-9_-]+)`?/i);

      if (match && match[1]) {
        const msgId = match[1];
        const userText = msg.text || '';
        const item = env.CONTACT_KV ? await env.CONTACT_KV.get(msgId, { type: 'json' }) : null;

        if (item) {
          if (item.type === 'order') {
            item.admin_notes = (item.admin_notes ? item.admin_notes + '\n' : '') + userText;
            if (env.CONTACT_KV) {
              await env.CONTACT_KV.put(msgId, JSON.stringify(item));
            }
            await sendTg(env, msg.chat.id, '📝 یادداشت شما روی سفارش ذخیره شد.', msg.message_id);
            return new Response('OK');
          } else {
            const isUpdate = !!item.reply_text;
            item.reply_text = userText;
            item.replied_at = Date.now();
            item.isPublic = true;
            if (env.CONTACT_KV) {
              await env.CONTACT_KV.put(msgId, JSON.stringify(item));
            }
            await sendTg(env, msg.chat.id, isUpdate ? '✏️ پاسخ شما به‌روزرسانی شد و در سایت قرار گرفت.' : '✅ پاسخ شما با موفقیت در بخش پرسش‌وپاسخ عمومی سایت منتشر شد.', msg.message_id);
            return new Response('OK');
          }
        } else {
          await sendTg(env, msg.chat.id, '⚠️ پیام با این شناسه در دیتابیس یافت نشد.', msg.message_id);
          return new Response('OK');
        }
      }
    }

    // -------------------------------------------------------------
    // WIZARD STATE CHECK (Direct Add Note, Add Article, Direct Rename)
    // -------------------------------------------------------------
    let adminState = null;
    if (env.FILES_KV) {
      const rawState = await env.FILES_KV.get(`ADMIN_STATE_${msg.chat.id}`).catch(() => null);
      if (rawState) {
        try { adminState = JSON.parse(rawState); } catch (e) { }
      }
    }

    // Direct Rename via simple text reply
    if (adminState && adminState.action === 'rename' && adminState.itemId && msg.text && !msg.text.startsWith('/')) {
      const newTitle = msg.text.trim();
      const itemId = adminState.itemId;
      const match = await findFileRecord(env, itemId);
      if (match) {
        if (match.isStatic) {
          match.data.title = newTitle;
          if (env.FILES_KV) {
            try {
              const rawTitles = await env.FILES_KV.get('STATIC_TITLE_OVERRIDES');
              const titlesObj = rawTitles ? JSON.parse(rawTitles) : {};
              titlesObj[match.staticFile] = newTitle;
              await env.FILES_KV.put('STATIC_TITLE_OVERRIDES', JSON.stringify(titlesObj));
            } catch (e) { }
          }
        } else if (env.FILES_KV) {
          match.data.title = newTitle;
          await env.FILES_KV.put(match.key, JSON.stringify(match.data));
        }
        if (env.FILES_KV) {
          await env.FILES_KV.delete(`ADMIN_STATE_${msg.chat.id}`).catch(() => {});
        }
        await sendTg(env, msg.chat.id, `✅ عنوان مطلب با موفقیت به «${newTitle}» تغییر یافت.`, msg.message_id, getCategoryKeyboard(itemId, match.data.category, match.data.is_document, match.data.is_article, match.isStatic));
        return new Response('OK');
      }
    }

    // Direct Note / Article creation from plain text message when wizard is active
    if (adminState && (adminState.action === 'add_note' || adminState.action === 'add_article') && msg.text && !msg.text.startsWith('/') && !msg.document && !msg.audio && !msg.video && !msg.photo) {
      const isArticle = adminState.action === 'add_article';
      const isDocument = !isArticle;
      const textTrim = msg.text.trim();
      const lines = textTrim.split('\n').filter(l => l.trim().length > 0);
      const title = lines[0].replace(/#(مستند|مقاله)/g, '').trim() || (isArticle ? 'مقاله جدید' : 'مستند جدید');
      const content = lines.slice(1).join('\n').trim() || title;

      const shortPostId = 'p_' + crypto.randomUUID().slice(0, 10);
      const defaultCat = isArticle ? '📝 مقالات و یادداشت‌ها' : '📚 مستندات و فایل‌ها';

      if (env.FILES_KV) {
        await env.FILES_KV.put(shortPostId, JSON.stringify({
          id: shortPostId,
          title: title,
          content: content,
          category: defaultCat,
          is_document: isDocument,
          is_article: isArticle,
          type: 'post',
          timestamp: Date.now()
        }));
        await env.FILES_KV.delete(`ADMIN_STATE_${msg.chat.id}`).catch(() => {});
      }

      const typeLabel = isDocument ? '📚 مستند و راهنما' : '📝 مقاله و یادداشت';
      const confirmMsg = `✅ **${typeLabel} «${title}» با موفقیت منتشر شد!**\n\n🏷 دسته‌بندی اولیه: ${defaultCat}\n\n👇 می‌توانید دسته‌بندی را تغییر دهید یا به هوش مصنوعی بسپارید:`;
      await sendTg(env, msg.chat.id, confirmMsg, msg.message_id, getCategoryKeyboard(shortPostId, defaultCat, isDocument, isArticle));
      return new Response('OK');
    }

    // -------------------------------------------------------------
    // FILE / DOCUMENT / MEDIA UPLOADS
    // -------------------------------------------------------------
    const doc = msg.document || msg.audio || msg.voice || msg.video || (msg.photo ? msg.photo[msg.photo.length - 1] : null);
    if (doc) {
      if (!env.FILES_KV) {
        await sendTg(env, msg.chat.id, '⚠️ متغیر FILES_KV متصل نیست. لطفا بایندینگ KV را در Cloudflare بررسی فرمایید.', msg.message_id);
        return new Response('OK');
      }

      const fileId = doc.file_id;
      const rawFileName = doc.file_name || (msg.document ? 'document.pdf' : (msg.audio ? 'audio.mp3' : (msg.voice ? 'voice.ogg' : (msg.video ? 'video.mp4' : 'image.jpg'))));
      const mime = doc.mime_type || (msg.photo ? 'image/jpeg' : 'application/octet-stream');
      const caption = (msg.caption || '').trim();
      const isHtml = rawFileName.toLowerCase().endsWith('.html') || rawFileName.toLowerCase().endsWith('.htm') || mime === 'text/html';
      const isPdf = rawFileName.toLowerCase().endsWith('.pdf') || mime === 'application/pdf';
      const isAud = !isHtml && (!!msg.audio || !!msg.voice || mime.startsWith('audio/'));
      const isVid = !isHtml && (!!msg.video || mime.startsWith('video/'));

      let isArticle = false;
      let isDocument = true;

      if (adminState && adminState.action === 'add_article') {
        isArticle = true;
        isDocument = false;
      } else if (adminState && adminState.action === 'add_note') {
        isDocument = true;
        isArticle = false;
      } else {
        isArticle = caption.includes('#مقاله');
        isDocument = !isArticle;
      }

      let extractedTitle = '';
      let extractedDesc = '';
      if (isHtml && env.BOT_TOKEN) {
        try {
          const pathReq = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
          if (pathReq.ok) {
            const pathData = await pathReq.json();
            if (pathData.ok && pathData.result?.file_path) {
              const fileResp = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${pathData.result.file_path}`);
              if (fileResp.ok) {
                const htmlText = await fileResp.text();
                const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                  extractedTitle = titleMatch[1].trim();
                }
                const cleanBody = htmlText
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
                if (cleanBody) {
                  extractedDesc = cleanBody.slice(0, 220);
                }
              }
            }
          }
        } catch (e) { }
      }

      const fileTitle = caption.replace(/#(مستند|مقاله)/g, '').trim() || extractedTitle || rawFileName.replace(/\.[^/.]+$/, '');
      const fileDesc = extractedDesc || caption || fileTitle;
      const shortFileId = 'f_' + crypto.randomUUID().slice(0, 10);
      let defaultCategory = isArticle ? '📝 مقالات و یادداشت‌ها' : '📁 دسته‌بندی عمومی';

      const catMatch = caption.match(/#(آموزش|پروژه|یادداشت|ایده|ابزار|عمومی)/);
      if (catMatch) {
        const catMap = {
          'آموزش': '🚀 مقالات و آموزش‌ها',
          'پروژه': '💻 پروژه‌ها و کدها',
          'یادداشت': '📚 مقالات و مستندات',
          'ایده': '💡 ایده‌ها و یادداشت‌ها',
          'ابزار': '🛠 ابزارها و راهنماها',
          'عمومی': '📁 دسته‌بندی عمومی'
        };
        defaultCategory = catMap[catMatch[1]] || defaultCategory;
      }

      const fileRecord = {
        id: shortFileId,
        file_id: fileId,
        file_name: rawFileName,
        title: fileTitle,
        description: fileDesc,
        category: defaultCategory,
        type: isHtml ? 'html' : (isAud ? 'audio' : (isVid ? 'video' : (isPdf ? 'pdf' : (msg.photo ? 'photo' : 'file')))),
        mime: mime,
        file_size: doc.file_size,
        is_document: isDocument,
        is_article: isArticle,
        timestamp: Date.now()
      };

      await env.FILES_KV.put(shortFileId, JSON.stringify(fileRecord));
      if (env.FILES_KV) {
        await env.FILES_KV.delete(`ADMIN_STATE_${msg.chat.id}`).catch(() => {});
      }

      const typeLabel = isArticle ? '📝 مقاله و یادداشت' : (isHtml ? '📚 مستند تعاملی HTML' : '📁 فایل آموزشی');
      const uploadText =
        `✅ **${typeLabel} با موفقیت دریافت و در سایت منتشر شد!**\n\n` +
        `📌 **عنوان:** «${fileTitle}»\n` +
        `📁 **نام فایل:** \`${rawFileName}\`\n` +
        `🏷 **دسته‌بندی:** ${defaultCategory}\n` +
        (extractedDesc ? `📝 **خلاصه متن:** «${extractedDesc.slice(0, 80)}...»\n\n` : '\n') +
        `👇 می‌توانید دسته‌بندی را تغییر دهید یا از هوش مصنوعی استفاده کنید:`;

      await sendTg(env, msg.chat.id, uploadText, msg.message_id, getCategoryKeyboard(shortFileId, defaultCategory, isDocument, isArticle, false));
      return new Response('OK');
    }

    // Text Commands
    const textTrim = (msg.text || '').trim();

    if (textTrim === '/add_note' || textTrim === '/add_file' || textTrim === '/add_doc') {
      if (env.FILES_KV) {
        await env.FILES_KV.put(`ADMIN_STATE_${msg.chat.id}`, JSON.stringify({ action: 'add_note', time: Date.now() }), { expirationTtl: 600 });
      }
      const promptText =
        `📥 **حالت افزودن مستند / فایل فعال شد!**\n\n` +
        `محتوای شما در بخش **«📚 کتابخانه مستندات و فایل‌ها»** قرار می‌گیرد:\n\n` +
        `۱. **ارسال فایل:** فایل HTML، PDF، صوت یا ویدیوی خود را همین الان بفرستید.\n` +
        `۲. **ارسال متن:** متن مستند یا خلاصه مطلب را ارسال فرمایید.\n\n` +
        `✨ *فایل شما بلافاصله در کتابخانه مستندات و فایل‌های سایت منتشر می‌شود.*`;

      await sendTg(env, msg.chat.id, promptText, msg.message_id, {
        inline_keyboard: [
          [{ text: '❌ لغو و بازگشت به منوی اصلی', callback_data: 'add:cancel' }]
        ]
      });
      return new Response('OK');
    }

    if (textTrim === '/add_article' || textTrim === '/add_post' || textTrim === '/add_note_text') {
      if (env.FILES_KV) {
        await env.FILES_KV.put(`ADMIN_STATE_${msg.chat.id}`, JSON.stringify({ action: 'add_article', time: Date.now() }), { expirationTtl: 600 });
      }
      const promptText =
        `✍️ **حالت افزودن یادداشت فعال شد!**\n\n` +
        `مطلب شما در بخش **«📝 یادداشت‌ها»** صفحه سایت منتشر می‌شود:\n\n` +
        `۱. **ارسال متن یادداشت:** متن را بنویسید (سطر اول عنوان یادداشت خواهد بود).\n` +
        `۲. **ارسال فایل متنی:** فایل متنی یا HTML یادداشت را بفرستید.\n\n` +
        `✨ *یادداشت شما در بخش یادداشت‌ها و مقالات سایت منتشر می‌شود.*`;

      await sendTg(env, msg.chat.id, promptText, msg.message_id, {
        inline_keyboard: [
          [{ text: '❌ لغو و بازگشت به منوی اصلی', callback_data: 'add:cancel' }]
        ]
      });
      return new Response('OK');
    }

    if (textTrim === '/start' || textTrim === '/menu' || textTrim === '/help') {
      const helpMsg =
        `🤖 **پنل مدیریت مرکزی وب‌سایت**\n\n` +
        `💡 از دکمه‌های زیر برای دسترسی سریع استفاده کنید، یا از دستورات مستقیم زیر کمک بگیرید:\n\n` +
        `➕ **/add_note** یا **/add_file** — افزودن مستند و فایل\n` +
        `➕ **/add_article** — افزودن یادداشت\n` +
        `📚 **/notes** یا **/docs** — مدیریت مستندات و فایل‌ها\n` +
        `📝 **/articles** — مدیریت یادداشت‌ها\n` +
        `🛒 **/orders** — سفارش‌های همکاری\n` +
        `💬 **/qas** — پرسش و پاسخ کاربران\n` +
        `📢 **/announce متن** — تنظیم بنر اطلاعیه\n` +
        `💡 **/word** — مدیریت واژهٔ روز (WotD)\n` +
        `🎲 **/new_word** — واژه جدید با AI\n` +
        `📊 **/stats** — آمار کامل وب‌سایت\n` +
        `⚡️ **/status** — بررسی سلامت سیستم و سرور\n` +
        `🤖 **/categorize_all** — دسته‌بندی هوشمند با AI\n` +
        `🔍 **/search عبارت** — جستجو در فایل‌ها`;

      await sendTg(env, msg.chat.id, helpMsg, msg.message_id, getMainMenuKeyboard());
      return new Response('OK');
    }

    // System Status Command
    if (textTrim === '/status' || textTrim === '/sys_status') {
      const hasFilesKv = !!env.FILES_KV;
      const hasContactKv = !!env.CONTACT_KV;
      const hasGemini = !!env.GEMINI_API_KEY;
      const hasBotToken = !!env.BOT_TOKEN;
      const hasChatId = !!env.CHAT_ID;

      let filesKvItems = 0;
      let contactKvItems = 0;

      if (hasFilesKv) {
        try {
          const list = await env.FILES_KV.list({ limit: 1000 });
          filesKvItems = (list.keys || []).length;
        } catch (e) { filesKvItems = -1; }
      }
      if (hasContactKv) {
        try {
          const list = await env.CONTACT_KV.list({ limit: 1000 });
          contactKvItems = (list.keys || []).length;
        } catch (e) { contactKvItems = -1; }
      }

      const sysReport =
        `⚡️ **گزارش سلامت و وضعیت زیرساخت وب‌سایت**\n\n` +
        `📦 **وضعیت حافظه‌های KV Cloudflare:**\n` +
        `• FILES_KV: ${hasFilesKv ? (filesKvItems >= 0 ? `🟢 متصل (${filesKvItems} کلید)` : '⚠️ خطای خواندن') : '🔴 نامتصل'}\n` +
        `• CONTACT_KV: ${hasContactKv ? (contactKvItems >= 0 ? `🟢 متصل (${contactKvItems} کلید)` : '⚠️ خطای خواندن') : '🔴 نامتصل'}\n\n` +
        `🔑 **پیکربندی هوش مصنوعی و ربات:**\n` +
        `• هوش مصنوعی Gemini: ${hasGemini ? '🟢 فعال' : '🔴 نامعتبر/تنظیم نشده'}\n` +
        `• توکن ربات تلگرام: ${hasBotToken ? '🟢 فعال' : '🔴 نامعتبر'}\n` +
        `• شناسه مدیر (CHAT_ID): ${hasChatId ? `🟢 ثبت شده (\`${env.CHAT_ID}\`)` : '⚠️ عمومی'}\n\n` +
        `⏰ زمان سرور: ${new Date().toISOString()}`;

      await sendTg(env, msg.chat.id, sysReport, msg.message_id, {
        inline_keyboard: [
          [{ text: '🔄 بررسی مجدد', callback_data: 'menu:sys_status' }],
          [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
        ]
      });
      return new Response('OK');
    }

    // Announcement Banner Commands
    if (textTrim.startsWith('/announce')) {
      const announceText = textTrim.replace(/^\/announce\s*/i, '').trim();
      if (!announceText) {
        await sendTg(env, msg.chat.id, '⚠️ لطفاً متن اطلاعیه را همراه دستور بنویسید:\nمثال: `/announce سایت امروز به‌روزرسانی شد.`', msg.message_id);
        return new Response('OK');
      }
      if (env.CONTACT_KV) {
        await env.CONTACT_KV.put('SITE_ANNOUNCEMENT', JSON.stringify({
          active: true,
          text: announceText,
          created_at: Date.now()
        }));
      }
      await sendTg(env, msg.chat.id, `✅ بنر اطلاعیه با موفقیت در بالای سایت فعال شد!\n\nمتن: «${announceText}»`, msg.message_id, {
        inline_keyboard: [[{ text: '🚫 حذف اطلاعیه', callback_data: 'announce:clear' }]]
      });
      return new Response('OK');
    }

    if (textTrim === '/clear_announcement' || textTrim === '/remove_announcement') {
      if (env.CONTACT_KV) {
        await env.CONTACT_KV.delete('SITE_ANNOUNCEMENT');
      }
      await sendTg(env, msg.chat.id, '✅ بنر اطلاعیه با موفقیت از روی وب‌سایت حذف شد.', msg.message_id);
      return new Response('OK');
    }

    // Word of the Day Commands
    if (textTrim === '/word' || textTrim === '/wotd') {
      const customWord = env.CONTACT_KV ? await env.CONTACT_KV.get('DAILY_WORD_OVERRIDE', { type: 'json' }) : null;
      const isCustom = !!(customWord && customWord.word);

      let wordText = '';
      if (isCustom) {
        wordText =
          `💡 **واژهٔ روز سفارشی فعال است:**\n\n` +
          `🌟 کلمه: **${customWord.word}** (${customWord.type || 'adj'})\n` +
          `🗣 تلفظ: \`${customWord.pron || '—'}\`\n` +
          `📖 معنی: **${customWord.meaning}**\n\n` +
          `📝 مثال: _${customWord.example || '—'}_\n` +
          `🇮🇷 ترجمه: ${customWord.example_fa || '—'}\n\n` +
          `💡 نکته: ${customWord.tip || '—'}`;
      } else {
        wordText = '💡 واژهٔ روز در حالت چرخش خودکار روزانه فعال است.';
      }

      await sendTg(env, msg.chat.id, wordText, msg.message_id, {
        inline_keyboard: [
          [{ text: '🎲 تولید واژه جدید با AI', callback_data: 'word:new_ai' }],
          isCustom ? [{ text: '🔄 بازنشانی به چرخش عادی', callback_data: 'word:reset_default' }] : [],
          [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
        ].filter(r => r.length > 0)
      });
      return new Response('OK');
    }

    if (textTrim === '/new_word' || textTrim === '/word_ai') {
      await sendTg(env, msg.chat.id, '🤖 در حال خلق واژه تخصصی جدید با هوش مصنوعی...', msg.message_id);
      try {
        const aiWord = await generateAiDailyWord(env);
        if (env.CONTACT_KV) {
          await env.CONTACT_KV.put('DAILY_WORD_OVERRIDE', JSON.stringify(aiWord));
        }
        const successText =
          `✨ **واژهٔ روز جدید با موفقیت تولید و در سایت ثبت شد!**\n\n` +
          `🌟 کلمه: **${aiWord.word}** (${aiWord.type})\n` +
          `🗣 تلفظ: \`${aiWord.pron}\`\n` +
          `📖 معنی: **${aiWord.meaning}**\n\n` +
          `📝 مثال: _${aiWord.example}_\n` +
          `🇮🇷 ترجمه: ${aiWord.example_fa}\n\n` +
          `💡 نکته: ${aiWord.tip}`;

        await sendTg(env, msg.chat.id, successText, msg.message_id, {
          inline_keyboard: [
            [{ text: '🎲 تولید یکی دیگر با AI', callback_data: 'word:new_ai' }],
            [{ text: '🔄 بازنشانی به چرخش عادی', callback_data: 'word:reset_default' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
          ]
        });
      } catch (e) {
        await sendTg(env, msg.chat.id, '⚠️ خطا در تولید واژه با هوش مصنوعی.', msg.message_id);
      }
      return new Response('OK');
    }

    if (textTrim === '/reset_word') {
      if (env.CONTACT_KV) {
        await env.CONTACT_KV.delete('DAILY_WORD_OVERRIDE');
      }
      await sendTg(env, msg.chat.id, '✅ واژه روز به چرخش هوشمند روزانه بازنشانی شد.', msg.message_id);
      return new Response('OK');
    }

    if (textTrim.startsWith('/set_word')) {
      const payload = textTrim.replace(/^\/set_word\s*/i, '').trim();
      const parts = payload.split('|').map(p => p.trim());
      if (parts.length < 4) {
        await sendTg(env, msg.chat.id, '⚠️ قالب دستور به این صورت است:\n`/set_word کلمه | تلفظ | نوع | معنی | مثال انگلیسی | ترجمه مثال | نکته`', msg.message_id);
        return new Response('OK');
      }
      const customObj = {
        word: parts[0],
        pron: parts[1] || '',
        type: parts[2] || 'adj',
        meaning: parts[3] || '',
        example: parts[4] || '',
        example_fa: parts[5] || '',
        synonyms: '',
        tip: parts[6] || '',
        icon: '🌟'
      };
      if (env.CONTACT_KV) {
        await env.CONTACT_KV.put('DAILY_WORD_OVERRIDE', JSON.stringify(customObj));
      }
      await sendTg(env, msg.chat.id, `✅ واژه سفارشی «${customObj.word}» در سایت ثبت شد!`, msg.message_id);
      return new Response('OK');
    }

    // Q&A Commands
    if (textTrim.startsWith('/add_qa')) {
      const payload = textTrim.replace(/^\/add_qa\s*/i, '').trim();
      const parts = payload.split('|').map(p => p.trim());
      if (parts.length < 2) {
        await sendTg(env, msg.chat.id, '⚠️ قالب دستور به این صورت است:\n`/add_qa نام | متن سوال | متن پاسخ شما`', msg.message_id);
        return new Response('OK');
      }

      const qName = parts[0] || 'کاربر سایت';
      const qMsg = parts[1] || '';
      const qReply = parts[2] || '';

      const newQaId = 'qa_' + crypto.randomUUID();
      const qaObj = {
        id: newQaId,
        type: 'qa',
        name: qName,
        message: qMsg,
        reply_text: qReply,
        replied_at: qReply ? Date.now() : null,
        isPublic: true,
        timestamp: Date.now()
      };

      if (env.CONTACT_KV) {
        await env.CONTACT_KV.put(newQaId, JSON.stringify(qaObj));
      }
      await sendTg(env, msg.chat.id, `✅ پرسش و پاسخ جدید با موفقیت ذخیره و در سایت منتشر شد!\n\n👤 نام: ${qName}\n❓ سوال: ${qMsg}\n💬 پاسخ: ${qReply || 'بدون پاسخ'}`, msg.message_id, {
        inline_keyboard: [[{ text: '💬 مشاهده لیست سوالات', callback_data: 'menu:qas' }]]
      });
      return new Response('OK');
    }

    if (textTrim.startsWith('/reply_qa')) {
      const payload = textTrim.replace(/^\/reply_qa\s*/i, '').trim();
      const spaceIdx = payload.indexOf(' ');
      if (spaceIdx > 0) {
        const qaId = payload.slice(0, spaceIdx).trim();
        const replyContent = payload.slice(spaceIdx + 1).trim();

        if (env.CONTACT_KV) {
          let record = await env.CONTACT_KV.get(qaId, { type: 'json' });
          if (!record && !qaId.startsWith('qa_')) {
            record = await env.CONTACT_KV.get(`qa_${qaId}`, { type: 'json' });
          }
          if (record) {
            record.reply_text = replyContent;
            record.replied_at = Date.now();
            record.isPublic = true;
            const targetKey = qaId.startsWith('qa_') ? qaId : `qa_${qaId}`;
            await env.CONTACT_KV.put(targetKey, JSON.stringify(record));
            await sendTg(env, msg.chat.id, `✅ پاسخ با موفقیت ثبت و در بخش پرسش و پاسخ سایت منتشر شد!\n\n💬 پاسخ: «${replyContent}»`, msg.message_id, {
              inline_keyboard: [[{ text: '💬 بازگشت به لیست سوالات', callback_data: 'menu:qas' }]]
            });
            return new Response('OK');
          }
        }
      }
      await sendTg(env, msg.chat.id, '⚠️ لطفاً شناسه و متن پاسخ را ارسال فرمایید:\n`/reply_qa شناسه متن پاسخ`', msg.message_id);
      return new Response('OK');
    }

    // Search Command
    if (textTrim.startsWith('/search')) {
      const query = textTrim.replace(/^\/search\s*/i, '').trim().toLowerCase();
      if (!query) {
        await sendTg(env, msg.chat.id, '🔍 لطفاً عبارت مورد جستجو را وارد کنید:\nمثال: `/search راهنمای سایت`', msg.message_id);
        return new Response('OK');
      }

      const allMaterials = await getAllSiteMaterials(env);
      const matches = allMaterials.filter(m => {
        const titleMatch = (m.title || '').toLowerCase().includes(query);
        const catMatch = (m.category || '').toLowerCase().includes(query);
        const fileMatch = (m.file_name || m.file || '').toLowerCase().includes(query);
        return titleMatch || catMatch || fileMatch;
      }).slice(0, 8);

      if (matches.length === 0) {
        await sendTg(env, msg.chat.id, `🔍 موردی با عبارت «${query}» یافت نشد.`, msg.message_id);
        return new Response('OK');
      }

      let searchRes = `🔍 **نتایج جستجو برای «${query}» (${matches.length} مورد):**\n\n`;
      const keyboard = [];
      matches.forEach((m, idx) => {
        searchRes += `${idx + 1}. **${m.title || m.file_name}**\n   🏷 ${m.category}\n\n`;
        keyboard.push([{ text: `⚙️ مدیریت «${(m.title || 'مطلب').slice(0, 25)}»`, callback_data: `v:${m.id}` }]);
      });
      keyboard.push([{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]);

      await sendTg(env, msg.chat.id, searchRes, msg.message_id, { inline_keyboard: keyboard });
      return new Response('OK');
    }

    // Rename Text Command
    if (textTrim.startsWith('edit:') || textTrim.startsWith('/rename')) {
      const payload = textTrim.replace(/^(edit:|\/rename\s*)/i, '').trim();
      const spaceIdx = payload.indexOf(' ');
      if (spaceIdx > 0) {
        const itemId = payload.slice(0, spaceIdx).trim();
        const newTitle = payload.slice(spaceIdx + 1).trim();

        const match = await findFileRecord(env, itemId);
        if (match) {
          if (match.isStatic) {
            match.data.title = newTitle;
            if (env.FILES_KV) {
              try {
                const rawTitles = await env.FILES_KV.get('STATIC_TITLE_OVERRIDES');
                const titlesObj = rawTitles ? JSON.parse(rawTitles) : {};
                titlesObj[match.staticFile] = newTitle;
                await env.FILES_KV.put('STATIC_TITLE_OVERRIDES', JSON.stringify(titlesObj));
              } catch (e) { }
            }
          } else if (env.FILES_KV) {
            match.data.title = newTitle;
            await env.FILES_KV.put(match.key, JSON.stringify(match.data));
          }
          await sendTg(env, msg.chat.id, `✅ عنوان با موفقیت به «${newTitle}» تغییر یافت.`, msg.message_id, getCategoryKeyboard(match.key, match.data.category, match.data.is_document, match.data.is_article, match.isStatic));
          return new Response('OK');
        }
      }
    }

    // Quick List Shortcuts
    if (textTrim === '/articles' || textTrim === '/posts' || textTrim === '/مقالات') {
      const allMaterials = await getAllSiteMaterials(env);
      const articles = allMaterials.filter(m => m.is_article || m.type === 'post' || m.type === 'article');

      if (articles.length === 0) {
        await sendTg(env, msg.chat.id, '📝 در حال حاضر مقاله‌ای در سایت ثبت نشده است.\n\n💡 برای انتشار آنی یک مقاله:\nمتن خود را با هشتگ `#مقاله` ارسال کنید، مانند:\n`#مقاله عنوان مقاله\nمتن کامل مقاله...`', msg.message_id, {
          inline_keyboard: [
            [{ text: '📚 مشاهده مستندات برای تبدیل به مقاله', callback_data: 'menu:notes' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
          ]
        });
        return new Response('OK');
      }

      const top5 = articles.slice(0, 5);
      let text = `📝 **فهرست مقالات و یادداشت‌ها (مجموع ${articles.length} مورد):**\n\n`;
      const keyboard = [];
      top5.forEach((m, idx) => {
        text += `${idx + 1}. 📝 **${m.title || m.file_name}**\n   🏷 ${m.category}\n\n`;
        keyboard.push([{ text: `⚙️ مدیریت «${(m.title || 'مقاله').slice(0, 25)}»`, callback_data: `v:${m.id}` }]);
      });
      keyboard.push([{ text: '📝 مشاهده کل مقالات و صفحه‌بندی', callback_data: 'menu:articles' }]);
      keyboard.push([{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]);

      await sendTg(env, msg.chat.id, text, msg.message_id, { inline_keyboard: keyboard });
      return new Response('OK');
    }

    if (textTrim === '/notes' || textTrim === '/docs' || textTrim === '/مستندات') {
      const allMaterials = await getAllSiteMaterials(env);
      const notes = allMaterials.filter(m => m.is_document && !m.is_article);

      if (notes.length === 0) {
        await sendTg(env, msg.chat.id, '📚 مستند و راهنما در وب‌سایت ثبت نشده است.', msg.message_id);
        return new Response('OK');
      }
      const top5 = notes.slice(0, 5);
      let text = `📚 **فهرست مستندات و فایل‌ها (مجموع ${notes.length} مورد):**\n\n`;
      const keyboard = [];
      top5.forEach((m, idx) => {
        text += `${idx + 1}. 📚 **${m.title || m.file_name}**\n   🏷 ${m.category}\n\n`;
        keyboard.push([{ text: `⚙️ مدیریت «${(m.title || 'مستند').slice(0, 25)}»`, callback_data: `v:${m.id}` }]);
      });
      keyboard.push([{ text: '📚 مشاهده لیست کامل مستندات', callback_data: 'menu:notes' }]);
      keyboard.push([{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]);

      await sendTg(env, msg.chat.id, text, msg.message_id, { inline_keyboard: keyboard });
      return new Response('OK');
    }

    if (textTrim === '/files') {
      const mats = await getAllSiteMaterials(env);
      if (mats.length === 0) {
        await sendTg(env, msg.chat.id, '📁 فایلی در وب‌سایت ثبت نشده است.', msg.message_id);
        return new Response('OK');
      }
      const top5 = mats.slice(0, 5);
      let text = `📁 **فهرست کلیه فایل‌ها و مستندات (مجموع ${mats.length} مورد):**\n\n`;
      const keyboard = [];
      top5.forEach((m, idx) => {
        text += `${idx + 1}. **${m.title || m.file_name}**\n   🏷 ${m.category}\n\n`;
        keyboard.push([{ text: `⚙️ مدیریت «${(m.title || 'فایل').slice(0, 25)}»`, callback_data: `v:${m.id}` }]);
      });
      keyboard.push([{ text: '📁 مشاهده لیست کامل و صفحه‌بندی', callback_data: 'menu:files' }]);
      keyboard.push([{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]);

      await sendTg(env, msg.chat.id, text, msg.message_id, { inline_keyboard: keyboard });
      return new Response('OK');
    }

    if (textTrim === '/categorize_all') {
      await sendTg(env, msg.chat.id, '⏳ در حال اجرای دسته‌بندی سریع هوش مصنوعی (بر اساس ۲۰۰ کلمه اول هر مستند)...', msg.message_id);
      const res = await processAICategories(env, 15);
      if (res.processed > 0) {
        let report = `✅ **دسته‌بندی ${res.processed} مستند با هوش مصنوعی انجام شد!**\n\n` +
          `⏳ باقیمانده: ${res.remaining} مورد\n\n` +
          `📁 آخرین موارد دسته‌بندی‌شده:\n`;
        (res.processedFiles || []).forEach((p, idx) => {
          report += `${idx + 1}. «${(p.title || p.file).slice(0, 30)}» ⬅️ ${p.category}\n`;
        });
        await sendTg(env, msg.chat.id, report, msg.message_id);
      } else if (res.remaining === 0) {
        await sendTg(env, msg.chat.id, '✨ تمامی مستندات و فایل‌های سایت قبلاً توسط هوش مصنوعی دسته‌بندی شده‌اند و مورد بررسی‌نشده‌ای وجود ندارد.', msg.message_id);
      } else {
        await sendTg(env, msg.chat.id, `⚠️ نتیجه دسته‌بندی: ${res.message || res.lastApiError || 'خطایی رخ داد'}`, msg.message_id);
      }
      return new Response('OK');
    }

    if (textTrim === '/orders') {
      let orders = [];
      if (env.CONTACT_KV) {
        const list = await env.CONTACT_KV.list({ limit: 1000 });
        const orderKeys = (list.keys || []).filter(k => k.name.startsWith('order_'));
        orders = await Promise.all(orderKeys.map(async k => {
          const item = await env.CONTACT_KV.get(k.name, { type: 'json' }).catch(() => null);
          if (item) item._key = k.name;
          return item;
        }));
        orders = orders.filter(Boolean).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }

      if (orders.length === 0) {
        await sendTg(env, msg.chat.id, '🛒 در حال حاضر هیچ سفارش همکاری در دیتابیس ثبت نشده است.', msg.message_id);
        return new Response('OK');
      }

      const top3 = orders.slice(0, 3);
      let text = `🛒 **آخرین سفارش‌های ثبت‌شده (مجموع ${orders.length} مورد):**\n\n`;
      const keyboard = [];
      top3.forEach((o, i) => {
        text += `🔹 **${i + 1}. ${o.name || 'مشتری'}** (${o.service || 'همکاری'})\n📞 ارتباط: \`${o.contact}\` | 💰 بودجه: ${o.budget || '—'}\n📝 ${o.details?.slice(0, 70)}...\n\n`;
        keyboard.push([{ text: `🗑 حذف سفارش ${o.name}`, callback_data: `ordel:${o._key || o.id}` }]);
      });
      keyboard.push([{ text: '🛒 مشاهده کل سفارش‌ها و صفحه‌بندی', callback_data: 'menu:orders' }]);
      keyboard.push([{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]);

      await sendTg(env, msg.chat.id, text, msg.message_id, { inline_keyboard: keyboard });
      return new Response('OK');
    }

    if (textTrim === '/qas') {
      let qas = [];
      if (env.CONTACT_KV) {
        const list = await env.CONTACT_KV.list({ limit: 1000 });
        const qaKeys = (list.keys || []).filter(k => k.name.startsWith('qa_'));
        qas = await Promise.all(qaKeys.map(async k => {
          const item = await env.CONTACT_KV.get(k.name, { type: 'json' }).catch(() => null);
          if (item) item._key = k.name;
          return item;
        }));
        qas = qas.filter(Boolean).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }

      if (qas.length === 0) {
        await sendTg(env, msg.chat.id, '💬 سوال جدیدی در دیتابیس ثبت نشده است.', msg.message_id);
        return new Response('OK');
      }

      const top3 = qas.slice(0, 3);
      let text = `💬 **آخرین پرسش‌های کاربران (مجموع ${qas.length} مورد):**\n\n`;
      const keyboard = [];
      top3.forEach((q, i) => {
        text += `❓ **${i + 1}. ${q.name || 'کاربر'}:** «${q.message?.slice(0, 70)}...»\n` +
          `وضعیت: ${q.reply_text ? '✅ پاسخ داده شده' : '⏳ بدون پاسخ'} | 🆔 \`${q.id || q._key}\`\n\n`;
        keyboard.push([
          { text: '💬 پاسخ', callback_data: `qans:${q.id || q._key}` },
          { text: '🗑 حذف', callback_data: `qdel:${q.id || q._key}` }
        ]);
      });
      keyboard.push([{ text: '💬 مشاهده کل پرسش‌ها و پاسخ‌ها', callback_data: 'menu:qas' }]);
      keyboard.push([{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]);

      await sendTg(env, msg.chat.id, text, msg.message_id, { inline_keyboard: keyboard });
      return new Response('OK');
    }

    // Site Statistics Command
    if (textTrim === '/stats') {
      let fileCount = 0, qaCount = 0, orderCount = 0;
      try {
        const allMats = await getAllSiteMaterials(env);
        fileCount = allMats.length;
      } catch (e) { }

      if (env.CONTACT_KV) {
        try {
          const contactList = await env.CONTACT_KV.list({ limit: 1000 });
          const contactKeys = contactList.keys || [];
          qaCount = contactKeys.filter(k => k.name.startsWith('qa_')).length;
          orderCount = contactKeys.filter(k => k.name.startsWith('order_')).length;
        } catch (e) { }
      }

      const statsReport =
        `📊 **داشبورد و آمار زندهٔ وب‌سایت**\n\n` +
        `📁 مجموع مستندات و فایل‌ها: **${fileCount}**\n` +
        `🛒 سفارش‌های ثبت‌شده: **${orderCount}**\n` +
        `💬 پرسش و پاسخ‌ها: **${qaCount}**\n\n` +
        `⏰ زمان سرور: ${new Date().toISOString()}`;

      await sendTg(env, msg.chat.id, statsReport, msg.message_id, {
        inline_keyboard: [
          [{ text: '🔄 به‌روزرسانی آمار', callback_data: 'menu:stats' }],
          [{ text: '📁 مستندات و مقالات', callback_data: 'menu:files' }],
          [{ text: '🔙 منوی اصلی', callback_data: 'menu:home' }]
        ]
      });
      return new Response('OK');
    }
    return new Response('OK');
  } catch (webhookErr) {
    console.error('handleTelegramWebhook fatal error:', webhookErr);
    return new Response('Internal Error', { status: 500 });
  }
}


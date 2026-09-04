#!/usr/bin/env node
/**
 * generate-sitemap.js
 * Builds public/sitemap.xml dynamically using SITE_DOMAIN from .env or site-config.
 */
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, 'public');
let ORIGIN = 'https://my-free-website.pages.dev';

// Attempt to read configured domain
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*(CUSTOM_DOMAIN|SITE_DOMAIN)\s*=\s*["']?([^"'\s]+)["']?/);
      if (match && match[2]) {
        ORIGIN = `https://${match[2].replace(/^https?:\/\//, '')}`;
        break;
      }
    }
  }
} catch (e) { }

const today = new Date().toISOString().slice(0, 10);
const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const isoDate = (ts) => {
  const d = ts ? new Date(Number(ts)) : null;
  return (d && !isNaN(d)) ? d.toISOString().slice(0, 10) : today;
};

const urls = [];
const add = (loc, { lastmod = today, changefreq = 'weekly', priority = '0.5' } = {}) =>
  urls.push({ loc: ORIGIN + loc, lastmod, changefreq, priority });

// Core pages
add('/', { changefreq: 'daily', priority: '1.0' });
add('/docs.html', { changefreq: 'daily', priority: '0.9' });

// Documentation & articles
let docCount = 0;
try {
  let docsFile = path.join(PUB, 'docs_list.json');
  if (fs.existsSync(docsFile)) {
    const docs = JSON.parse(fs.readFileSync(docsFile, 'utf8'));
  docs.forEach((n) => {
    if (!n.path) return;
    if (n.category === '❌ حذف شده') return;
    add(n.path, { changefreq: 'monthly', priority: '0.6', lastmod: isoDate(n.timestamp) });
      docCount++;
    });
  }
} catch (e) { console.warn('docs_list.json skipped:', e.message); }

const body = urls.map((u) =>
  `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), xml);
console.log(`[+] sitemap.xml written: ${urls.length} URLs (${docCount} docs) pointing to ${ORIGIN}.`);

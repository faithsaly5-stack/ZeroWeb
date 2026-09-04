
(function () {
    'use strict';

    function initApp() {

        // --- Scroll Reveal System ---
        try {
            const reveals = document.querySelectorAll('.reveal');
            if (reveals.length > 0 && 'IntersectionObserver' in window) {
                const revealObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('active');
                            observer.unobserve(entry.target);
                        }
                    });
                }, { root: null, rootMargin: '0px 0px -5% 0px', threshold: 0.05 });
                
                reveals.forEach(el => revealObserver.observe(el));
            } else {
                // Fallback: make all visible immediately
                document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
            }
        } catch (e) {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
        }

        // --- 3D Tilt & Spotlight Tracking for Bento & Service Cards ---
        try {
            const cardsToTrack = document.querySelectorAll('.bento-card, .service-card');
            cardsToTrack.forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    card.style.setProperty('--mouse-x', `${x}px`);
                    card.style.setProperty('--mouse-y', `${y}px`);
                    if (card.classList.contains('bento-card') && window.innerWidth >= 1040) {
                        const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -4;
                        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 4;
                        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
                    }
                }, { passive: true });
                card.addEventListener('mouseleave', () => {
                    if (card.classList.contains('bento-card')) {
                        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
                    }
                });
            });
        } catch (e) {}

        const isMobile = window.innerWidth < 768;
        const prefersReduced = false; // Enable smooth animations by default

        // Safe localStorage (never throws — private mode / sandboxed contexts)
        const store = {
            get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
            set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
        };

        /* =====================================================================
           AMBIENT CANVAS — interactive constellation network field
           ===================================================================== */
        const canvas = document.getElementById('canvas-bg');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            let width = canvas.width = window.innerWidth;
            let height = canvas.height = window.innerHeight;
            let nodes = [];
            // Adaptive node count for silky performance
            const nodeCount = isMobile ? 16 : 36;
            const drawLinks = true;
            const LINK = isMobile ? 75 : 110, LINK2 = LINK * LINK;
            let pointer = { x: -1000, y: -1000, radius: 140 };
            const PR2 = 140 * 140;
            let rafId = null;
            let running = false;
            let lastFrame = 0;
            const FRAME_MS = 1000 / 33; // 30-33fps cap for smooth low-power ambient background

            const palette = () => document.documentElement.classList.contains('light-theme')
                ? { a: '5, 150, 105', b: '2, 132, 199', line: '5, 150, 105', alpha: 0.35 }
                : { a: '52, 211, 153', b: '56, 189, 248', line: '45, 212, 191', alpha: 0.70 };
            let colors = palette();

            window.addEventListener('mousemove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
            window.addEventListener('mouseleave', () => { pointer.x = -1000; pointer.y = -1000; });
            window.addEventListener('touchmove', e => {
                if (e.touches && e.touches[0]) {
                    pointer.x = e.touches[0].clientX;
                    pointer.y = e.touches[0].clientY;
                }
            }, { passive: true });
            window.addEventListener('touchend', () => { pointer.x = -1000; pointer.y = -1000; }, { passive: true });

            class Node {
                constructor() {
                    this.x = Math.random() * width;
                    this.y = Math.random() * height;
                    this.vx = (Math.random() - 0.5) * 0.4;
                    this.vy = (Math.random() - 0.5) * 0.4;
                    this.radius = Math.random() * 1.6 + 0.8;
                    this.hue = Math.random() > 0.5 ? 'a' : 'b';
                }
                update() {
                    this.x += this.vx; this.y += this.vy;
                    if (this.x < 0 || this.x > width) this.vx *= -1;
                    if (this.y < 0 || this.y > height) this.vy *= -1;
                    const dx = this.x - pointer.x, dy = this.y - pointer.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < PR2 && d2 > 0.01) {
                        const dist = Math.sqrt(d2);
                        const force = (140 - dist) / 140;
                        this.x += dx / dist * force * 1.6;
                        this.y += dy / dist * force * 1.6;
                    }
                }
                draw() {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${colors[this.hue]}, ${0.65 * colors.alpha})`;
                    ctx.fill();
                }
            }

            const build = () => { nodes = []; for (let i = 0; i < nodeCount; i++) nodes.push(new Node()); };
            build();

            function paint() {
                ctx.clearRect(0, 0, width, height);
                for (let i = 0; i < nodes.length; i++) {
                    nodes[i].update(); nodes[i].draw();
                    if (!drawLinks) continue;
                    for (let j = i + 1; j < nodes.length; j++) {
                        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < LINK2) {
                            ctx.beginPath();
                            ctx.moveTo(nodes[i].x, nodes[i].y);
                            ctx.lineTo(nodes[j].x, nodes[j].y);
                            ctx.strokeStyle = `rgba(${colors.line}, ${(1 - d2 / LINK2) * 0.16 * colors.alpha})`;
                            ctx.lineWidth = 0.6;
                            ctx.stroke();
                        }
                    }
                }
            }

            function loop(now) {
                if (!running) return;
                rafId = requestAnimationFrame(loop);
                if (now - lastFrame < FRAME_MS) return;
                lastFrame = now;
                paint();
            }

            function start() { if (!running && !prefersReduced) { running = true; lastFrame = 0; rafId = requestAnimationFrame(loop); } }
            function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

            start();

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) stop(); else if (!prefersReduced) start();
            });

            window.__refreshCanvasTheme = () => { colors = palette(); };

            window.addEventListener('resize', () => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
                build();
            }, { passive: true });
        }

        /* =====================================================================
           NAV — Zero-reflow scroll state, progress bar, active link, mobile menu
           ===================================================================== */
        const nav = document.getElementById('nav');
        const scrollBar = document.getElementById('scroll-bar');
        const backTop = document.getElementById('back-to-top');
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        const navLinks = Array.from(document.querySelectorAll('.nav-link'));
        const sections = ['about', 'portfolio', 'services', 'posts', 'qa', 'order'].map(id => document.getElementById(id)).filter(Boolean);
        const hero = document.querySelector('.hero');
        const scrollCue = document.getElementById('scroll-cue');

        let ticking = false;
        let cachedDocH = 1;
        let cachedSectionOffsets = [];
        function recalculateLayoutMetrics() {
            cachedDocH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            cachedSectionOffsets = sections.map(s => ({ id: s.id, top: s.offsetTop }));
        }
        recalculateLayoutMetrics();
        window.addEventListener('resize', recalculateLayoutMetrics, { passive: true });
        window.addEventListener('load', recalculateLayoutMetrics, { passive: true });

        function onScroll() {
            const y = window.scrollY;
            if (nav) nav.classList.toggle('scrolled', y > 20);
            if (scrollBar) scrollBar.style.transform = 'scaleX(' + (y / cachedDocH).toFixed(4) + ')';
            if (backTop) backTop.classList.toggle('show', y > 520);
            if (scrollCue) scrollCue.classList.toggle('hidden-cue', y > 60);

            // Active section detection with zero layout thrashing
            let current = '';
            const mid = y + window.innerHeight * 0.32;
            for (let i = cachedSectionOffsets.length - 1; i >= 0; i--) {
                if (cachedSectionOffsets[i].top <= mid) { current = cachedSectionOffsets[i].id; break; }
            }
            navLinks.forEach(l => {
                const href = l.getAttribute('href') || '';
                l.classList.toggle('active', href === '#' + current);
            });
            ticking = false;
        }
        window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
        onScroll();

        if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }));

        if (navToggle && navMenu) {
            const closeMenu = () => { navMenu.classList.remove('open'); navToggle.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false'); };
            navToggle.addEventListener('click', () => {
                const open = navMenu.classList.toggle('open');
                navToggle.classList.toggle('open', open);
                navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
            window.addEventListener('resize', () => { if (window.innerWidth > 1040) closeMenu(); }, { passive: true });
        }



        /* =====================================================================
           STYLESEED INTERACTIVE CURSOR SPOTLIGHT TRACKING (Linear/Raycast Specular)
           ===================================================================== */
        if (!isMobile) {
            const spotlightCards = document.querySelectorAll('.card, .bento-card, .service-card, .dw-card, .pathfinder-card, .estimator-card, .order-card, .tg-card');
            spotlightCards.forEach(card => {
                card.addEventListener('mousemove', e => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    card.style.setProperty('--mouse-x', `${x}px`);
                    card.style.setProperty('--mouse-y', `${y}px`);
                }, { passive: true });
            });
        }

        /* =====================================================================
           STAT COUNTERS
           ===================================================================== */
        const counters = document.querySelectorAll('.stat-num[data-count]');
        if (counters.length) {
            const fa = n => n.toLocaleString('fa-IR');
            const run = (el) => {
                const target = parseInt(el.getAttribute('data-count'), 10) || 0;
                const suffix = el.getAttribute('data-suffix') || '';
                if (prefersReduced) { el.textContent = fa(target) + suffix; return; }
                const dur = 1400; const start = performance.now();
                const step = (now) => {
                    const p = Math.min((now - start) / dur, 1);
                    const eased = 1 - Math.pow(1 - p, 3);
                    el.textContent = fa(Math.round(target * eased)) + suffix;
                    if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            };
            if ('IntersectionObserver' in window) {
                const co = new IntersectionObserver((entries) => {
                    entries.forEach(e => { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } });
                }, { threshold: 0.15 });
                counters.forEach(c => co.observe(c));
            } else counters.forEach(run);
        }

        /* =====================================================================
           THEME TOGGLE
           ===================================================================== */
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                document.documentElement.classList.toggle('light-theme');
                const theme = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
                store.set('theme', theme);
                if (window.__refreshCanvasTheme) window.__refreshCanvasTheme();
            });
        }

        /* =====================================================================
           LANGUAGE TOGGLE (On-Demand Google Translate — 0ms Initial TBT)
           ===================================================================== */
        /* =====================================================================
           LANGUAGE TOGGLE & INSTANT BILINGUAL LOCALIZATION
           ===================================================================== */
        const langToggleBtn = document.getElementById('lang-toggle');
        if (langToggleBtn) {
            let gtLoaded = false;
            const loadGoogleTranslate = () => {
                if (gtLoaded) return;
                gtLoaded = true;
                window.googleTranslateElementInit = function () {
                    if (window.google && window.google.translate) {
                        new google.translate.TranslateElement({ pageLanguage: 'fa', includedLanguages: 'en,fa', autoDisplay: false }, 'google_translate_element');
                    }
                };
                const s = document.createElement('script');
                s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
                s.async = true;
                document.body.appendChild(s);
            };

            const I18N_MAP = [
                { sel: '.nav-brand .brand-text b', en: (window.__SITE_CONFIG__?.BRAND_LOGO_TEXT || window.__SITE_CONFIG__?.SITE_NAME || 'MySite'), fa: (window.__SITE_CONFIG__?.BRAND_LOGO_TEXT || window.__SITE_CONFIG__?.SITE_NAME || 'سایت من') },
                { sel: '.nav-brand .brand-text span', en: (window.__SITE_CONFIG__?.BRAND_LOGO_SUBTITLE || window.__SITE_CONFIG__?.SITE_SUBTITLE || 'Cloudflare Platform'), fa: (window.__SITE_CONFIG__?.BRAND_LOGO_SUBTITLE || window.__SITE_CONFIG__?.SITE_SUBTITLE || 'میزبانی ابری کلودفلر') },
                { sel: '.nav-links a[href="#about"]', en: 'Highlights', fa: 'ویژگی‌ها' },
                { sel: '.nav-links a[href="#portfolio"]', en: 'Platforms', fa: 'پلتفرم‌ها' },
                { sel: '.nav-links a[href="#services"]', en: 'Modules', fa: 'امکانات' },
                { sel: '.nav-links a[href="/docs.html"]', en: 'Docs', fa: 'مستندات' },
                { sel: '.nav-links a[href="#posts"]', en: 'Notes', fa: 'یادداشت‌ها' },
                { sel: '.nav-links a[href="#qa"]', en: 'FAQ & Q&A', fa: 'سوالات و پرسش‌ها' },
                { sel: '.nav-cta', en: 'Get Started', fa: 'شروع رایگان' },
                { sel: '.hero-badge', en: '<span class="dot"></span> 100% Free Hosting &nbsp;·&nbsp; Cloudflare Pages &nbsp;·&nbsp; Telegram CMS', fa: '<span class="dot"></span> میزبانی کاملاً رایگان &nbsp;·&nbsp; <b>کلودفلر</b> &nbsp;·&nbsp; <b>مدیریت تلگرام</b>' },
                { sel: '.hero h1', en: ((window.__SITE_CONFIG__?.HERO_TITLE || 'Build Your Website for Free') + '<span class="hero-title-sub">' + (window.__SITE_CONFIG__?.HERO_SUBTITLE || 'Cloudflare Pages & Telegram CMS') + '</span>'), fa: ((window.__SITE_CONFIG__?.HERO_TITLE || 'ساخت و راه‌اندازی رایگان وب‌سایت') + '<span class="hero-title-sub">' + (window.__SITE_CONFIG__?.HERO_SUBTITLE || 'کلودفلر و سیستم مدیریت تلگرام') + '</span>') },
                { sel: '.hero-lead', en: 'Deploy your modern, high-speed website completely <b>free</b> on Cloudflare, and manage articles, orders, and interactions directly from <b>Telegram</b>.', fa: 'وب‌سایت شخصی و حرفه‌ای خود را به‌صورت کاملاً <b>رایگان</b> روی زیرساخت پرسرعت Cloudflare پیاده‌سازی کنید و تمام محتوا، نظرات و فایل‌ها را مستقیماً از <b>تلگرام</b> مدیریت نمایید.' },
                { sel: '.hero-cta .btn-primary span', en: 'Get Started', fa: 'شروع و ارتباط' },
                { sel: '.hero-cta .btn-ghost span', en: 'Explore Docs', fa: 'مشاهده مستندات' },
                { sel: '#about .eyebrow', en: 'Highlights', fa: 'ویژگی‌های برجسته' },
                { sel: '#portfolio .eyebrow', en: 'Built-in Platforms', fa: 'پلتفرم‌های آماده' },
                { sel: '#services .eyebrow', en: 'Features & Modules', fa: 'امکانات و ماژول‌ها' },
                { sel: '#order .eyebrow', en: 'Contact & Collaboration', fa: 'ارتباط مستقیم' }
            ];

            function applyInstantI18n(toEn) {
                I18N_MAP.forEach(item => {
                    const el = document.querySelector(item.sel);
                    if (el) {
                        if (toEn) {
                            if (!el.dataset.faText) el.dataset.faText = el.innerHTML;
                            el.innerHTML = item.en;
                        } else {
                            if (el.dataset.faText) el.innerHTML = el.dataset.faText;
                        }
                    }
                });
            }

            langToggleBtn.addEventListener('click', () => {
                const isEn = document.documentElement.classList.contains('lang-en');
                const targetLang = isEn ? 'fa' : 'en';

                if (!gtLoaded) {
                    loadGoogleTranslate();
                }

                let attempts = 0;
                const triggerTranslate = () => {
                    const gtSelect = document.querySelector('.goog-te-combo');
                    if (gtSelect) {
                        gtSelect.value = targetLang;
                        gtSelect.dispatchEvent(new Event('change'));
                    } else if (attempts++ < 15) {
                        setTimeout(triggerTranslate, 200);
                    }
                };
                triggerTranslate();

                if (!isEn) {
                    document.documentElement.lang = 'en';
                    document.documentElement.dir = 'ltr';
                    document.documentElement.classList.add('lang-en');
                    langToggleBtn.querySelector('.lang-text').textContent = 'FA';
                    applyInstantI18n(true);
                } else {
                    document.documentElement.lang = 'fa';
                    document.documentElement.dir = 'rtl';
                    document.documentElement.classList.remove('lang-en');
                    langToggleBtn.querySelector('.lang-text').textContent = 'EN';
                    applyInstantI18n(false);
                }
            });

            if (document.cookie.indexOf('googtrans=/fa/en') !== -1 || document.cookie.indexOf('googtrans=/auto/en') !== -1) {
                setTimeout(() => {
                    loadGoogleTranslate();
                    document.documentElement.lang = 'en';
                    document.documentElement.dir = 'ltr';
                    document.documentElement.classList.add('lang-en');
                    langToggleBtn.querySelector('.lang-text').textContent = 'FA';
                    applyInstantI18n(true);
                }, 1500);
            }
        }






        /* Card tilt + spotlight, magnetic buttons and ripple now live in fx.js
           (delegated, so they also cover dynamically-loaded cards). */

        /* =====================================================================
           DATA LOADERS
           ===================================================================== */
        const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
        const skeletons = (n) => Array.from({ length: n }).map(() => '<div class="skeleton"></div>').join('');

        // 1. Articles & Notes (/api/content)
        const postsGrid = document.getElementById('posts-grid') || document.getElementById('content-grid');
        const postsLoader = document.getElementById('posts-loader') || document.getElementById('content-loader');

        if (postsLoader) postsLoader.style.display = 'none';
        if (postsGrid) {
            postsGrid.innerHTML = '<div class="skeleton-grid" style="grid-column: 1/-1;">' + skeletons(3) + '</div>';

            fetch('/api/content?t=' + Date.now())
                .then(res => res.json())
                .then(items => {
                    const articles = Array.isArray(items) ? items.filter(it => it.type === 'post' || it.is_article) : [];
                    if (articles.length === 0) {
                        postsGrid.innerHTML = '<p style="text-align:center; color: var(--text-light); grid-column: 1 / -1; padding: 40px 0;">هنوز یادداشت یا مقاله‌ای منتشر نشده است.</p>';
                        return;
                    }

                    postsGrid.innerHTML = articles.map((item, i) => {
                        const title = esc(item.title || 'یادداشت');
                        const content = esc(item.content || item.description || '');
                        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString('fa-IR') : '';
                        return `
                    <article class="blog-post fade-in-up" style="animation-delay:${0.06 * Math.min(i, 8)}s">
                        <h3 class="blog-title">${title}</h3>
                        <p class="blog-content">${content}</p>
                        ${dateStr ? `<span class="blog-date">📅 ${dateStr}</span>` : ''}
                    </article>`;
                    }).join('');
                })
                .catch(() => {
                    if (postsGrid) postsGrid.innerHTML = '<p style="text-align:center; color:#f87171; grid-column:1 / -1; padding: 30px 0;">خطا در بارگذاری یادداشت‌ها و مقالات.</p>';
                });
        }

        // 2. Q&A (/api/public-messages)
        const qaList = document.getElementById('qa-list');
        const qaLoader = document.getElementById('qa-loader');
        if (qaLoader) qaLoader.style.display = 'none';
        if (qaList) {
            qaList.innerHTML = '<div class="skeleton-grid">' + skeletons(2) + '</div>';
            fetch('/api/public-messages?t=' + Date.now())
                .then(res => res.json())
                .then(data => {
                    const latest = data.slice(0, 3);
                    qaList.innerHTML = latest.length === 0
                        ? '<p style="text-align:center; color: var(--text-light);">در حال حاضر پرسش و پاسخی موجود نیست.</p>'
                        : latest.map((qa, i) => {
                            const dateStr = new Date(qa.replied_at || qa.timestamp).toLocaleDateString('fa-IR');
                            return `<div class="qa-bubble fade-in-up" style="animation-delay:${0.08 * i}s">
                            <div class="qa-question">
                                <div class="qa-meta"><span class="icon">👤</span> ${esc(qa.name || 'کاربر ناشناس')}</div>
                                <p>${esc(qa.message)}</p>
                            </div>
                            <div class="qa-answer">
                                <div class="qa-meta"><span class="icon">💬</span> پاسخ پشتیبانی <span style="margin-right:auto; font-size:0.78rem; opacity:0.7;">${dateStr}</span></div>
                                <p>${esc(qa.reply_text)}</p>
                            </div>
                        </div>`;
                        }).join('');
                })
                .catch(() => { qaList.innerHTML = '<p style="text-align:center; color:#f87171;">خطا در بارگذاری پرسش و پاسخ.</p>'; });
        }

        // 3. Tools (tools_list.json) — present only on tools page
        const toolsGrid = document.getElementById('tools-grid');
        const toolsLoader = document.getElementById('tools-loader');
        if (toolsGrid && toolsLoader) {
            fetch('/tools_list.json?t=' + Date.now())
                .then(res => res.json())
                .then(data => {
                    toolsLoader.style.display = 'none';
                    const latest = data.slice(0, 3);
                    toolsGrid.innerHTML = latest.map((tool, i) => {
                        const rawUrl = String(tool.url || tool.path || '').trim();
                        const safeUrl = (rawUrl.startsWith('/') || rawUrl.startsWith('https://')) ? esc(rawUrl) : '#';
                        return `
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="file-item fade-in-up" style="animation-delay:${0.08 * i}s">
                        <div class="file-icon">${esc(tool.icon || '🧰')}</div>
                        <div class="file-info">
                            <div class="file-title">${esc(tool.title)}</div>
                            <div class="file-desc">${esc(tool.description)}</div>
                        </div>
                        <span class="download-btn">🔗 مشاهده</span>
                    </a>`;
                    }).join('');
                })
                .catch(() => { toolsLoader.style.display = 'none'; toolsGrid.innerHTML = '<p style="text-align:center; color:#f87171; grid-column:1 / -1;">خطا در بارگذاری ابزارها.</p>'; });
        }

        /* =====================================================================
           ORDER FORM  ->  /api/order  (lead goes to owner's Telegram)
           ===================================================================== */
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            const toast = document.getElementById('toast');
            const submitBtn = document.getElementById('order-submit');
            let toastTimer = null;
            const showToast = (msg, isError) => {
                if (!toast) return;
                toast.textContent = msg;
                toast.classList.toggle('toast-error', !!isError);
                toast.classList.add('show');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(() => toast.classList.remove('show'), isError ? 6000 : 5000);
            };
            const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

            orderForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    name: val('ord-name'),
                    contact: val('ord-contact'),
                    service: (document.getElementById('service') || {}).value || '',
                    budget: val('budget'),
                    deadline: val('deadline'),
                    details: val('details')
                };
                if (!payload.name || !payload.contact || !payload.details) {
                    showToast('لطفاً نام، راه ارتباطی و توضیحات را کامل کنید.', true);
                    return;
                }
                if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('loading'); }
                try {
                    const res = await fetch('/api/order', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && data.success) {
                        orderForm.reset();
                        showToast('درخواست شما ثبت شد؛ به‌زودی بررسی و پاسخ داده خواهد شد.', false);
                    } else { throw new Error('failed'); }
                } catch (err) {
                    const fallbackTg = window.__SITE_CONFIG__?.TELEGRAM_USERNAME ? ('@' + window.__SITE_CONFIG__.TELEGRAM_USERNAME) : 'ادمین';
                    showToast(`ارسال ناموفق بود. لطفاً با ${fallbackTg} در ارتباط باشید.`, true);
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('loading'); }
                }
            });
        }

        /* =====================================================================
           Q&A FORM  ->  /api/contact  (question -> owner's Telegram -> reply
           publishes it back into the Q&A list below)
           ===================================================================== */
        const qaForm = document.getElementById('qa-form');
        if (qaForm) {
            const toast = document.getElementById('toast');
            const qaBtn = document.getElementById('qa-submit');
            let qaToastTimer = null;
            const qaToast = (msg, isError) => {
                if (!toast) return;
                toast.textContent = msg;
                toast.classList.toggle('toast-error', !!isError);
                toast.classList.add('show');
                clearTimeout(qaToastTimer);
                qaToastTimer = setTimeout(() => toast.classList.remove('show'), isError ? 6000 : 5000);
            };

            qaForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameEl = document.getElementById('qa-name');
                const msgEl = document.getElementById('qa-message');
                const hpEl = document.getElementById('qa-website');
                const payload = {
                    name: nameEl ? nameEl.value.trim() : '',
                    message: msgEl ? msgEl.value.trim() : '',
                    website: hpEl ? hpEl.value : ''
                };
                if (!payload.name || !payload.message) {
                    qaToast('لطفاً نام و متن پرسش را کامل کنید.', true);
                    return;
                }
                if (qaBtn) { qaBtn.disabled = true; qaBtn.classList.add('loading'); }
                try {
                    const res = await fetch('/api/contact', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.status === 429) {
                        qaToast('کمی صبر کنید و دوباره تلاش کنید.', true);
                    } else {
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data.success) {
                            qaForm.reset();
                            qaToast('پرسش شما ثبت شد؛ پاسخ پس از بررسی در همین بخش منتشر خواهد شد.', false);
                        } else { throw new Error('failed'); }
                    }
                } catch (err) {
                    qaToast('ارسال ناموفق بود. لطفاً دوباره تلاش کنید.', true);
                } finally {
                    if (qaBtn) { qaBtn.disabled = false; qaBtn.classList.remove('loading'); }
                }
            });
        }

        /* =====================================================================
           HERO SPECIALTY FOCUS MODE SWITCHER
           ===================================================================== */
        const heroModeBtns = document.querySelectorAll('.hero-mode-btn');
        const heroFocusTitle = document.getElementById('hero-focus-title');
        const heroFocusDesc = document.getElementById('hero-focus-desc');

        if (heroModeBtns.length && heroFocusTitle && heroFocusDesc) {
            const MODE_DATA = {
                cloud: {
                    title: '☁️ میزبانی پرسرعت روی سرورهای جهانی Cloudflare',
                    desc: 'استقرار سریع با فایل deploy.bat؛ استفاده از ۱۰۰ هزار درخواست رایگان روزانه در Cloudflare، پشتیبانی از HTTPS خودکار و اتصال رایگان دامنه اختصاصی شما.'
                },
                tg: {
                    title: '🤖 سیستم مدیریت محتوا (CMS) مستقیماً با ربات تلگرام',
                    desc: 'بدون نیاز به پنل‌های پیچیده وردپرس؛ فقط با ارسال پیام یا فایل به ربات تلگرام خود، مقالات جدید بسازید، سفارش‌ها را بررسی کرده و پیام‌های مخاطبان را پاسخ دهید.'
                },
                env: {
                    title: '🛠 شخصی‌سازی صفر تا صد تمامی بخش‌ها با فایل .env',
                    desc: 'تنها با تغییر متغیرهای فایل .env می‌توانید نام سایت، نشان‌ها، شبکه‌های اجتماعی، کلیدهای ارتباطی و ماژول‌ها را مطابق سلیقه خود تغییر دهید.'
                }
            };

            heroModeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.getAttribute('data-mode') || 'cloud';
                    heroModeBtns.forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-selected', 'true');

                    if (MODE_DATA[mode]) {
                        heroFocusTitle.innerHTML = `<span>${MODE_DATA[mode].title}</span>`;
                        heroFocusDesc.textContent = MODE_DATA[mode].desc;
                    }
                });
            });
        }

        /* =====================================================================
           SERVICES CATEGORY TABS FILTER
           ===================================================================== */
        const svcTabs = document.querySelectorAll('.svc-tab');
        const svcCards = document.querySelectorAll('.service-card');
        if (svcTabs.length && svcCards.length) {
            svcTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const filter = tab.getAttribute('data-filter') || 'all';
                    svcTabs.forEach(t => {
                        t.classList.remove('active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');

                    svcCards.forEach(card => {
                        const cats = (card.getAttribute('data-category') || '').split(' ');
                        if (filter === 'all' || cats.includes(filter)) {
                            card.classList.remove('hidden-card');
                        } else {
                            card.classList.add('hidden-card');
                        }
                    });
                });
            });

            // Connect Hero Skill Pills to Service Tabs
            document.querySelectorAll('.pill-interactive').forEach(pill => {
                pill.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetFilter = pill.getAttribute('data-filter-target');
                    const targetTab = document.querySelector(`.svc-tab[data-filter="${targetFilter}"]`);
                    if (targetTab) {
                        targetTab.click();
                        const svcSection = document.getElementById('services');
                        if (svcSection) svcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        }



        /* =====================================================================
           FAQ LIVE SEARCH & CATEGORY CHIPS
           ===================================================================== */
        const faqSearchInput = document.getElementById('faq-search-input');
        const faqSearchClear = document.getElementById('faq-search-clear');
        const faqChips = document.querySelectorAll('.faq-chip');
        const faqItems = document.querySelectorAll('.faq-item');
        const faqEmpty = document.getElementById('faq-empty');

        if (faqItems.length) {
            let currentFaqCategory = 'all';

            const filterFaqs = () => {
                const query = faqSearchInput ? faqSearchInput.value.trim().toLowerCase() : '';
                if (faqSearchClear) {
                    faqSearchClear.style.display = query ? 'block' : 'none';
                }

                let visibleCount = 0;
                faqItems.forEach(item => {
                    const cat = item.getAttribute('data-faq-cat') || '';
                    const matchesCat = (currentFaqCategory === 'all') || cat.includes(currentFaqCategory);
                    
                    const text = item.textContent.toLowerCase();
                    const matchesQuery = !query || text.includes(query);

                    if (matchesCat && matchesQuery) {
                        item.classList.remove('hidden-faq');
                        if (query) {
                            item.open = true; // auto-expand matching items during search
                        }
                        visibleCount++;
                    } else {
                        item.classList.add('hidden-faq');
                    }
                });

                if (faqEmpty) {
                    faqEmpty.style.display = visibleCount === 0 ? 'block' : 'none';
                }
            };

            if (faqSearchInput) {
                faqSearchInput.addEventListener('input', filterFaqs);
            }
            if (faqSearchClear) {
                faqSearchClear.addEventListener('click', () => {
                    faqSearchInput.value = '';
                    filterFaqs();
                    faqSearchInput.focus();
                });
            }

            faqChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    faqChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    currentFaqCategory = chip.getAttribute('data-faq-cat') || 'all';
                    filterFaqs();
                });
            });
        }

        /* Service cards -> prefill the order form's service select */
        document.querySelectorAll('[data-service]').forEach((el) => {
            el.addEventListener('click', () => {
                const svc = el.getAttribute('data-service');
                const sel = document.getElementById('service');
                if (sel && svc) {
                    const opt = Array.from(sel.options).find(o => o.value === svc || o.text.trim() === svc);
                    sel.value = opt ? opt.value : (Array.from(sel.options).find(o => /سایر/.test(o.text)) || {}).value || '';
                }
            });
        });

        /* =====================================================================
           DAILY VOCABULARY / FEATURE CARDS (Optional Widget)
           ===================================================================== */
        const dwWord = document.getElementById('dw-word');
        if (dwWord) {
            // Optional widget placeholder
        }

        /* =====================================================================
           AI: بهبود شرح درخواست — /api/refine-brief (same Gemini pipeline)
           ===================================================================== */
        const refineBtn = document.getElementById('refine-btn');
        if (refineBtn) {
            const undoBtn = document.getElementById('refine-undo');
            const detailsEl = document.getElementById('details');
            let prevText = null;
            refineBtn.addEventListener('click', async () => {
                const text = detailsEl ? detailsEl.value.trim() : '';
                if (text.length < 10) {
                    const t = document.getElementById('toast');
                    if (t) { t.textContent = 'ابتدا چند خط دربارهٔ درخواست خود بنویسید.'; t.classList.add('toast-error', 'show'); setTimeout(() => t.classList.remove('show'), 4000); }
                    return;
                }
                refineBtn.disabled = true; refineBtn.classList.add('loading');
                try {
                    const res = await fetch('/api/refine-brief', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ details: text, service: (document.getElementById('service') || {}).value || '' })
                    });
                    const data = await res.json();
                    if (data && data.refined) {
                        prevText = text;
                        detailsEl.value = data.refined;
                        detailsEl.dispatchEvent(new Event('input'));
                        if (undoBtn) undoBtn.style.display = '';
                    } else { throw new Error('no result'); }
                } catch (e) {
                    const t = document.getElementById('toast');
                    if (t) { t.textContent = 'فعلاً امکان بهبود متن نیست؛ متن شما همان‌طور که هست ارسال می‌شود.'; t.classList.add('toast-error', 'show'); setTimeout(() => t.classList.remove('show'), 4500); }
                } finally {
                    refineBtn.disabled = false; refineBtn.classList.remove('loading');
                }
            });
            if (undoBtn) undoBtn.addEventListener('click', () => {
                if (prevText != null && detailsEl) { detailsEl.value = prevText; prevText = null; undoBtn.style.display = 'none'; }
            });
        }

        /* =====================================================================
           LIVE SITE ANNOUNCEMENT BANNER (Controlled remotely via Telegram Bot)
           ===================================================================== */
        (async function initLiveAnnouncement() {
            try {
                const res = await fetch('/api/announcement');
                if (!res.ok) return;
                const data = await res.json();
                if (data && data.active && data.text) {
                    const dismissedKey = 'dismissed_announce_' + (data.updated_at || data.text.slice(0, 15));
                    if (store.get(dismissedKey)) return;

                    const banner = document.createElement('aside');
                    banner.id = 'live-announcement-bar';
                    banner.className = 'live-announcement-bar';
                    banner.setAttribute('role', 'status');
                    banner.setAttribute('aria-live', 'polite');
                    banner.innerHTML = `
                    <div class="announcement-content">
                        <span class="announcement-icon" aria-hidden="true">📢</span>
                        <span class="announcement-text">${escapeHtml(data.text)}</span>
                        <button type="button" class="announcement-close" aria-label="بستن اطلاعیه" id="close-announcement-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                `;
                    document.body.prepend(banner);
                    document.documentElement.classList.add('has-announcement');

                    document.getElementById('close-announcement-btn')?.addEventListener('click', () => {
                        store.set(dismissedKey, '1');
                        banner.classList.add('banner-closing');
                        setTimeout(() => {
                            banner.remove();
                            document.documentElement.classList.remove('has-announcement');
                        }, 300);
                    });
                }
            } catch (e) {
                // Silently ignore if offline
            }
        })();

        /* =====================================================================
           STYLESEED AI FLOATING CHATBOT CONTROLLER
           ===================================================================== */
        (function initAiChatbot() {
            const toggleBtn = document.getElementById('ai-chat-toggle');
            const chatWin = document.getElementById('ai-chat-window');
            const closeBtn = document.getElementById('chat-close-btn');
            const clearBtn = document.getElementById('chat-clear-btn');
            const chatForm = document.getElementById('ai-chat-form');
            const chatInput = document.getElementById('ai-chat-input');
            const messagesContainer = document.getElementById('ai-chat-messages');

            if (!toggleBtn || !chatWin || !chatForm || !chatInput || !messagesContainer) return;

            let chatHistory = [];
            try {
                const saved = sessionStorage.getItem('ai_chat_history');
                if (saved) chatHistory = JSON.parse(saved);
            } catch (e) {}

            function toggleChat(forceOpen) {
                const isHidden = chatWin.style.display === 'none';
                const open = forceOpen !== undefined ? forceOpen : isHidden;
                chatWin.style.display = open ? 'flex' : 'none';
                if (open) {
                    chatInput.focus();
                    scrollMessagesBottom();
                }
            }

            toggleBtn.addEventListener('click', () => toggleChat());
            closeBtn?.addEventListener('click', () => toggleChat(false));
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && chatWin.style.display !== 'none') {
                    toggleChat(false);
                }
            });

            clearBtn?.addEventListener('click', () => {
                chatHistory = [];
                try { sessionStorage.removeItem('ai_chat_history'); } catch(e){}
                messagesContainer.innerHTML = `
                    <div class="chat-msg chat-msg-bot">
                        <div class="chat-bubble">
                            سلام! 👋 من دستیار هوشمند وب‌سایت هستم. هر سوالی درباره راه‌اندازی، اتصال به Cloudflare، ربات تلگرام یا شخصی‌سازی فایل .env داری بپرس تا راهنماییت کنم! 🚀🌐
                        </div>
                    </div>
                    <div class="chat-suggestions">
                        <button type="button" class="chat-chip" data-query="چطور سایت رو روی کلودفلر مستقر کنم؟">🚀 راهنمای استقرار Cloudflare</button>
                        <button type="button" class="chat-chip" data-query="ربات تلگرام چطور به سایت وصل میشه؟">🤖 اتصال ربات تلگرام</button>
                        <button type="button" class="chat-chip" data-query="چطور مقالات و یادداشت‌ها رو ویرایش کنم؟">📁 افزودن یادداشت‌ها و ابزار</button>
                        <button type="button" class="chat-chip" data-query="تنظیمات فایل .env چطور کار میکنه؟">⚙️ راهنمای متغیرهای .env</button>
                    </div>
                `;
                bindChips();
            });

            function scrollMessagesBottom() {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            function appendMessage(text, isUser = false) {
                const msgEl = document.createElement('div');
                msgEl.className = 'chat-msg ' + (isUser ? 'chat-msg-user' : 'chat-msg-bot');
                
                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble';
                bubble.textContent = text;
                msgEl.appendChild(bubble);

                messagesContainer.appendChild(msgEl);
                scrollMessagesBottom();
            }

            function showTypingIndicator() {
                const typingEl = document.createElement('div');
                typingEl.className = 'chat-msg chat-msg-bot chat-typing-container';
                typingEl.id = 'chat-typing-bubble';
                typingEl.innerHTML = `
                    <div class="chat-bubble chat-typing">
                        <span></span><span></span><span></span>
                    </div>
                `;
                messagesContainer.appendChild(typingEl);
                scrollMessagesBottom();
            }

            function removeTypingIndicator() {
                const el = document.getElementById('chat-typing-bubble');
                if (el) el.remove();
            }

            function bindChips() {
                messagesContainer.querySelectorAll('.chat-chip').forEach(chip => {
                    chip.onclick = () => {
                        const q = chip.getAttribute('data-query');
                        if (q) {
                            chatInput.value = q;
                            sendMessage(q);
                        }
                    };
                });
            }
            bindChips();

            async function sendMessage(text) {
                const query = (text || chatInput.value || '').trim();
                if (!query) return;

                chatInput.value = '';
                appendMessage(query, true);

                chatHistory.push({ role: 'user', content: query });
                if (chatHistory.length > 8) chatHistory = chatHistory.slice(-8);
                try { sessionStorage.setItem('ai_chat_history', JSON.stringify(chatHistory)); } catch(e){}

                showTypingIndicator();
                const sendBtn = document.getElementById('ai-chat-send');
                if (sendBtn) sendBtn.disabled = true;

                try {
                    const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: query, history: chatHistory })
                    });

                    removeTypingIndicator();
                    if (sendBtn) sendBtn.disabled = false;

                    if (!res.ok) {
                        if (res.status === 429) {
                            appendMessage('تعداد درخواست‌های شما زیاد بوده است. لطفا چند دقیقه بعد مجددا پیام دهید. ⏳');
                        } else {
                            appendMessage('متاسفانه در حال حاضر ارتباط با هوش مصنوعی برقرار نشد. لطفا بعدا تلاش کنید.');
                        }
                        return;
                    }

                    const data = await res.json();
                    const reply = data.reply || data.answer || 'پاسخی دریافت نشد.';
                    appendMessage(reply, false);
                    chatHistory.push({ role: 'model', content: reply });
                    try { sessionStorage.setItem('ai_chat_history', JSON.stringify(chatHistory)); } catch(e){}

                } catch (err) {
                    removeTypingIndicator();
                    if (sendBtn) sendBtn.disabled = false;
                    appendMessage('خطای غیرمنتظره در ارسال پیام رخ داد. لطفا اتصال اینترنت خود را بررسی کنید.');
                }
            }

            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                sendMessage();
            });
        })();

        /* =====================================================================
           UNIVERSAL HELPER FUNCTIONS & TOAST SYSTEM
           ===================================================================== */
        function escapeHtml(str) {
            if (typeof str !== 'string') return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        let universalToastTimer = null;
        function showToast(message, type = 'success', duration = 4500) {
            let toastEl = document.getElementById('universal-toast');
            if (!toastEl) {
                toastEl = document.createElement('div');
                toastEl.id = 'universal-toast';
                toastEl.className = 'universal-toast';
                document.body.appendChild(toastEl);
            }
            clearTimeout(universalToastTimer);
            const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
            toastEl.className = `universal-toast toast-${type} show`;
            toastEl.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${escapeHtml(message)}</span>`;
            
            universalToastTimer = setTimeout(() => {
                toastEl.classList.remove('show');
            }, duration);
        }

        /* =====================================================================
           SERVICES FILTER TABS & SERVICE CARD PRE-FILL CONTROLLER
           ===================================================================== */
        (function initServicesFilter() {
            const tabs = document.querySelectorAll('.svc-tab');
            const cards = document.querySelectorAll('.services-grid .service-card');
            const serviceSelect = document.getElementById('service');

            function filterServices(category) {
                tabs.forEach(tab => {
                    const isActive = tab.getAttribute('data-filter') === category;
                    tab.classList.toggle('active', isActive);
                    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });

                cards.forEach(card => {
                    const cardCats = (card.getAttribute('data-category') || '').split(' ');
                    const match = category === 'all' || cardCats.includes(category);
                    if (match) {
                        card.classList.remove('is-hidden');
                        card.style.display = 'flex';
                        card.style.opacity = '1';
                    } else {
                        card.classList.add('is-hidden');
                        card.style.display = 'none';
                        card.style.opacity = '0';
                    }
                });
            }

            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filter = tab.getAttribute('data-filter') || 'all';
                    filterServices(filter);
                });
            });

            document.querySelectorAll('.social-pills .pill-interactive').forEach(pill => {
                pill.addEventListener('click', (e) => {
                    const targetCat = pill.getAttribute('data-filter-target');
                    if (targetCat) {
                        filterServices(targetCat);
                    }
                });
            });

            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const serviceName = card.getAttribute('data-service');
                    if (serviceName && serviceSelect) {
                        serviceSelect.value = serviceName;
                        showToast(`خدمت «${serviceName}» در فرم سفارش انتخاب شد ✨`, 'success', 3500);
                    }
                });
            });
        })();

        } // end of initApp

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();




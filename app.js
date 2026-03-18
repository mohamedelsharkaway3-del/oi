/**
 * إيجبت دودو تراڤيل — Egypt Dodo Travel
 * app.js — Main Application Logic v3.0
 * WhatsApp: 01093319693
 */

'use strict';

// ════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════
const CONFIG = {
  whatsapp: '201093319693',
  supabase: {
    url: localStorage.getItem('sb_url') || '',
    key: localStorage.getItem('sb_key') || ''
  },
  animationDelay: 100,
  tickerInterval: 10000,
};

// ════════════════════════════════════════════
// SUPABASE INIT
// ════════════════════════════════════════════
let supabase = null;

function initSupabase() {
  const url = localStorage.getItem('supabase_url') || CONFIG.supabase.url;
  const key = localStorage.getItem('supabase_key') || CONFIG.supabase.key;
  if (url && key && typeof window.supabase !== 'undefined') {
    try {
      supabase = window.supabase.createClient(url, key);
      console.log('✅ Supabase connected');
    } catch (e) {
      console.warn('⚠️ Supabase init failed:', e.message);
    }
  }
}

// ════════════════════════════════════════════
// WHATSAPP UTILS
// ════════════════════════════════════════════
function getWhatsApp() {
  const settings = getSiteSettings();
  if (settings.whatsapp) return settings.whatsapp.replace(/[^0-9]/g, '');
  return CONFIG.whatsapp;
}

function openWhatsApp(msg = '') {
  const num = getWhatsApp();
  const url = `https://wa.me/${num}` + (msg ? `?text=${encodeURIComponent(msg)}` : '');
  window.open(url, '_blank');
}

// Update all WA links on page
function updateWALinks() {
  const num = getWhatsApp();
  const url = `https://wa.me/${num}`;
  document.querySelectorAll('[data-wa-link], #whatsappFab, .whatsapp-btn').forEach(el => {
    if (el.tagName === 'A') el.href = url;
  });
}

// ════════════════════════════════════════════
// SITE SETTINGS (CMS)
// ════════════════════════════════════════════
function getSiteSettings() {
  try {
    return JSON.parse(localStorage.getItem('siteSettings') || '{}');
  } catch { return {}; }
}

function saveSiteSettings(data) {
  localStorage.setItem('siteSettings', JSON.stringify(data));
}

async function loadSiteSettings() {
  const cached = getSiteSettings();
  if (Object.keys(cached).length) applySiteSettings(cached);

  if (!supabase) return;
  try {
    const { data, error } = await supabase.from('site_settings').select('*').single();
    if (!error && data?.settings) {
      saveSiteSettings(data.settings);
      applySiteSettings(data.settings);
    }
  } catch (e) { /* use cached */ }
}

function applySiteSettings(s) {
  if (!s) return;

  // Logo
  if (s.logoUrl) {
    const logoEl = document.getElementById('siteLogo');
    if (logoEl) logoEl.innerHTML = `<img src="${s.logoUrl}" style="height:42px;border-radius:10px;" alt="logo" onerror="this.parentElement.innerHTML='🕌 إيجبت دودو تراڤيل'">`;
  }

  // Cover / Hero
  if (s.coverUrl) {
    const coverEl = document.getElementById('heroCover');
    if (coverEl) coverEl.style.backgroundImage = `url('${s.coverUrl}')`;
  }

  // Hero welcome message
  if (s.welcome) {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = s.welcome;
  }

  // Contact fields
  const fields = { phone: '.site-phone', email: '.site-email', address: '.site-address', hours: '.site-hours' };
  Object.entries(fields).forEach(([key, sel]) => {
    if (s[key]) document.querySelectorAll(sel).forEach(el => el.textContent = s[key]);
  });

  // WhatsApp
  if (s.whatsapp) {
    updateWALinks();
    document.querySelectorAll('.wa-number').forEach(el => el.textContent = s.whatsapp);
  }

  // Marketing messages
  if (s.marketingMessages?.length) window._marketingMessages = s.marketingMessages;

  // Packages
  if (s.packages?.length) renderDynamicPackages(s.packages);
}

// ════════════════════════════════════════════
// DYNAMIC PACKAGES
// ════════════════════════════════════════════
function renderDynamicPackages(packages) {
  const container = document.getElementById('packagesContainer');
  if (!container) return;
  container.innerHTML = packages.map((pkg, i) => `
    <div class="package-card reveal ${i === 1 ? 'featured' : ''}">
      <span class="pkg-icon">${pkg.icon || '🕌'}</span>
      <div class="pkg-name">${pkg.name || 'برنامج'}</div>
      <div class="pkg-stars">${'★'.repeat(parseInt(pkg.stars) || 3)}</div>
      <span class="pkg-price">${pkg.price || '0'} <span>ج.م</span></span>
      <ul class="pkg-features">
        <li><i class="fas fa-check-circle"></i> فندق ${pkg.stars || 3} نجوم</li>
        <li><i class="fas fa-plane"></i> تذاكر طيران ذهاب وإياب</li>
        <li><i class="fas fa-bus"></i> مواصلات مريحة</li>
        <li><i class="fas fa-utensils"></i> وجبات يومية</li>
        <li><i class="fas fa-user-tie"></i> مرشد سياحي متخصص</li>
      </ul>
      <button class="btn-gold" style="width:100%" onclick="bookPackage('${pkg.name}')">
        <i class="fas fa-calendar-check"></i> احجز الآن
      </button>
    </div>
  `).join('');
  initRevealObserver();
}

// ════════════════════════════════════════════
// MARKETING TICKER
// ════════════════════════════════════════════
const DEFAULT_MESSAGES = [
  { icon: '🕋', label: 'عروض الحج 2025', text: 'أماكن محدودة جداً! سارع بالحجز الآن وضمن مكانك في رحلة العمر' },
  { icon: '🌙', label: 'عمرة رمضان المبارك', text: 'عيش تجربة روحانية لا تُنسى في أقدس البقاع في شهر رمضان' },
  { icon: '💎', label: 'باقة البريميوم', text: 'إقامة فندقية 4 نجوم بالقرب من الحرم مع خدمة VIP كاملة' },
  { icon: '✈️', label: 'عمرة الاقتصادية', text: 'رحلة روحانية كاملة بأسعار تناسب الجميع — ابدأ رحلتك من 8500 ج.م' },
  { icon: '🎁', label: 'عرض خاص للعائلات', text: 'خصم 10% عند حجز 3 أفراد أو أكثر — تواصل معنا الآن!' },
  { icon: '⭐', label: 'تقييم 5 نجوم', text: 'أكثر من 5000 حاج ومعتمر وثقوا بنا — انضم لعائلة إيجبت دودو' },
  { icon: '🤝', label: 'خدمة 24/7', text: 'فريقنا متاح على مدار الساعة لمساعدتك في أي استفسار أو طلب' },
  { icon: '📋', label: 'تسهيل الإجراءات', text: 'نتكفل بكل تفاصيل رحلتك من التأشيرة حتى العودة — أنت تصلي ونحن نرتب' },
];

let _tickerIndex = 0;
let _tickerTimer = null;

function getMessages() {
  return (window._marketingMessages?.length) ? window._marketingMessages : DEFAULT_MESSAGES;
}

function startTicker() {
  showTickerMessage(_tickerIndex);
}

function showTickerMessage(idx) {
  const msgs = getMessages();
  const msg = msgs[idx % msgs.length];
  const container = document.getElementById('marketingTicker');
  if (!container || !msg) return;

  container.innerHTML = `
    <div class="ticker-card" id="tickerCard">
      <div class="ticker-icon">${msg.icon || '✨'}</div>
      <div class="ticker-text">
        <strong>${msg.label || ''}</strong>
        <p>${msg.text || msg}</p>
      </div>
      <div class="ticker-progress"><div class="ticker-progress-bar"></div></div>
    </div>`;

  if (_tickerTimer) clearTimeout(_tickerTimer);
  _tickerTimer = setTimeout(() => {
    const card = document.getElementById('tickerCard');
    if (card) card.classList.add('hiding');
    setTimeout(() => {
      _tickerIndex = (idx + 1) % msgs.length;
      showTickerMessage(_tickerIndex);
    }, 400);
  }, CONFIG.tickerInterval);
}

// ════════════════════════════════════════════
// BOOKING FORM
// ════════════════════════════════════════════
async function submitBooking() {
  const name = document.getElementById('booking-name')?.value.trim();
  const phone = document.getElementById('booking-phone')?.value.trim();
  const pkg = document.getElementById('booking-package')?.value;

  if (!name || !phone || !pkg) {
    showAlert('error', '❌ الرجاء ملء الحقول المطلوبة (*)', 'booking-alert');
    return;
  }

  const btn = document.getElementById('booking-submit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> جاري الإرسال...'; }

  const bookingData = {
    name, phone,
    email: document.getElementById('booking-email')?.value.trim() || null,
    package: pkg,
    people: parseInt(document.getElementById('booking-people')?.value) || 1,
    travel_date: document.getElementById('booking-date')?.value || null,
    notes: document.getElementById('booking-notes')?.value.trim() || null,
    status: 'في الانتظار',
    created_at: new Date().toISOString()
  };

  // Try Supabase first
  if (supabase) {
    try {
      const { error } = await supabase.from('bookings').insert([bookingData]);
      if (error) throw error;
      showAlert('success', '✅ تم إرسال طلبك بنجاح! سيتواصل فريقنا معك خلال 24 ساعة 🎉', 'booking-alert');
      clearBookingForm();
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب'; }
      return;
    } catch (err) {
      console.warn('Supabase failed, using WhatsApp:', err.message);
    }
  }

  // WhatsApp fallback
  const msg = `*🕌 طلب حجز جديد — إيجبت دودو تراڤيل*\n\n` +
    `👤 الاسم: ${bookingData.name}\n` +
    `📱 الهاتف: ${bookingData.phone}\n` +
    `✉️ البريد: ${bookingData.email || 'لم يذكر'}\n` +
    `🕌 البرنامج: ${bookingData.package}\n` +
    `👥 عدد الأفراد: ${bookingData.people}\n` +
    `📅 تاريخ السفر: ${bookingData.travel_date || 'لم يحدد'}\n` +
    `📝 ملاحظات: ${bookingData.notes || 'لا يوجد'}\n\n` +
    `_تم الإرسال من الموقع الرسمي_`;

  showAlert('success', '✅ جاري تحويلك لواتساب لإتمام الحجز...', 'booking-alert');
  setTimeout(() => {
    openWhatsApp(msg);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب'; }
  }, 1500);
}

function clearBookingForm() {
  ['booking-name','booking-phone','booking-email','booking-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const people = document.getElementById('booking-people');
  if (people) people.value = '1';
  const date = document.getElementById('booking-date');
  if (date) date.value = '';
  const pkg = document.getElementById('booking-package');
  if (pkg) pkg.value = '';
}

function bookPackage(pkgName) {
  const select = document.getElementById('booking-package');
  if (select) select.value = pkgName;
  const section = document.getElementById('booking');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// ════════════════════════════════════════════
// COST CALCULATOR
// ════════════════════════════════════════════
const PACKAGE_PRICES = {
  'عمرة الاقتصادية': 8500,
  'عمرة البريميوم': 18000,
  'عمرة رمضان': 22000,
  'رحلة الحج': 45000,
  'باقة العائلة': 14000,
};

function calculateCost() {
  const pkg = document.getElementById('calc-package')?.value;
  const people = parseInt(document.getElementById('calc-people')?.value) || 1;
  const days = parseInt(document.getElementById('calc-days')?.value) || 7;

  let base = PACKAGE_PRICES[pkg] || 8500;
  let extra = (days > 7) ? (days - 7) * 350 : 0;
  let subtotal = (base + extra) * people;
  let discount = people >= 3 ? 0.10 : 0;
  let total = Math.round(subtotal * (1 - discount));

  const resultEl = document.getElementById('calc-result');
  const priceEl = document.getElementById('calc-price');
  const detailEl = document.getElementById('calc-detail');

  if (resultEl) resultEl.style.display = 'block';
  if (priceEl) priceEl.textContent = total.toLocaleString('ar-EG') + ' ج.م';
  if (detailEl) {
    let detail = `${people} ${people > 1 ? 'أفراد' : 'فرد'} × ${(base + extra).toLocaleString('ar-EG')} ج.م`;
    if (discount > 0) detail += ` — خصم ${discount * 100}% للمجموعات 🎉`;
    detailEl.textContent = detail;
  }
}

// ════════════════════════════════════════════
// PHOTO SEARCH
// ════════════════════════════════════════════
async function searchPhotos() {
  const phone = document.getElementById('photo-phone')?.value.trim();
  const name = document.getElementById('photo-name')?.value.trim();
  if (!phone && !name) { showAlert('error', '❌ أدخل رقم الهاتف أو الاسم للبحث', 'photo-alert'); return; }

  const statusEl = document.getElementById('photo-status');
  const resultsEl = document.getElementById('photo-results');
  if (statusEl) statusEl.style.display = 'flex';
  if (resultsEl) resultsEl.innerHTML = '';

  await new Promise(r => setTimeout(r, 1500));
  if (statusEl) statusEl.style.display = 'none';

  if (!supabase) {
    showAlert('info', 'ℹ️ ميزة البحث عن الصور تحتاج لتفعيل قاعدة البيانات. تواصل معنا عبر واتساب.', 'photo-alert');
    return;
  }
  try {
    let query = supabase.from('photos').select('*');
    if (phone) query = query.eq('phone', phone);
    else if (name) query = query.ilike('client_name', `%${name}%`);
    const { data, error } = await query;
    if (error) throw error;
    if (data?.length) {
      if (resultsEl) resultsEl.innerHTML = data.map(p => `
        <div class="photo-item">
          <img src="${p.url}" alt="${p.trip || 'صورة'}" loading="lazy">
          <div style="padding:14px">
            <strong style="color:var(--primary)">${p.trip || 'رحلة سابقة'}</strong>
            <p style="color:var(--text-sec);font-size:0.85rem;margin:5px 0">${p.date || ''}</p>
            <a href="${p.url}" download class="btn-gold" style="font-size:0.82rem;padding:9px 20px;margin-top:8px">
              <i class="fas fa-download"></i> تحميل
            </a>
          </div>
        </div>`).join('');
    } else {
      showAlert('error', '❌ لم نجد صوراً لهذا الرقم. تواصل معنا للمساعدة.', 'photo-alert');
    }
  } catch (err) {
    showAlert('error', '❌ خطأ في البحث: ' + err.message, 'photo-alert');
  }
}

// ════════════════════════════════════════════
// FAQ ACCORDION
// ════════════════════════════════════════════
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ════════════════════════════════════════════
// SCROLL REVEAL
// ════════════════════════════════════════════
function initRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ════════════════════════════════════════════
// COUNTER ANIMATION
// ════════════════════════════════════════════
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target') || el.textContent.replace(/\D/g, ''));
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = Math.round(current).toLocaleString('ar-EG') + suffix;
          if (current >= target) clearInterval(timer);
        }, 16);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => observer.observe(el));
}

// ════════════════════════════════════════════
// HEADER SCROLL EFFECT
// ════════════════════════════════════════════
function initHeaderScroll() {
  const header = document.querySelector('header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// ════════════════════════════════════════════
// MOBILE MENU
// ════════════════════════════════════════════
function toggleMobileMenu() {
  const menu = document.getElementById('mobileNav');
  if (menu) menu.classList.toggle('open');
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileNav');
  if (menu) menu.classList.remove('open');
}

// ════════════════════════════════════════════
// MODALS
// ════════════════════════════════════════════
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ════════════════════════════════════════════
// ALERTS
// ════════════════════════════════════════════
function showAlert(type, message, containerId = 'global-alert') {
  const container = document.getElementById(containerId) || document.querySelector('.alert-container');
  if (!container) { console.log(`Alert [${type}]:`, message); return; }

  container.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
  container.textContent = message;
  container.style.display = 'block';

  if (type !== 'error') {
    setTimeout(() => { container.style.display = 'none'; }, 5000);
  }
}

// ════════════════════════════════════════════
// AI CHAT ASSISTANT
// ════════════════════════════════════════════
const AI_RESPONSES = {
  default: [
    'أهلاً وسهلاً! 😊 أنا مساعد إيجبت دودو الذكي. كيف يمكنني مساعدتك؟',
    'يسعدني مساعدتك في الحجز أو الاستفسار عن البرامج المتاحة.',
  ],
  umrah: [
    'لدينا باقات عمرة متنوعة تبدأ من 8,500 ج.م. 🕌\n\nتشمل: فندق، طيران، مواصلات، ومرشد سياحي.\n\nهل تريد تفاصيل باقة معينة؟',
  ],
  hajj: [
    'رحلات الحج لدينا بسعر 45,000 ج.م تقريباً. 🕋\n\nتشمل جميع الخدمات الفاخرة.\n\nالأماكن محدودة — احجز مبكراً!',
  ],
  price: [
    'أسعارنا:\n💚 عمرة اقتصادية: 8,500 ج.م\n💎 عمرة بريميوم: 18,000 ج.م\n🌙 عمرة رمضان: 22,000 ج.م\n🕋 الحج: 45,000 ج.م',
  ],
  contact: [
    `للتواصل المباشر:\n📱 واتساب: 01093319693\n⏰ نعمل 24/7 لخدمتك`,
  ],
  booking: [
    'للحجز، يمكنك:\n1️⃣ ملء نموذج الحجز في الصفحة\n2️⃣ التواصل عبر واتساب: 01093319693\n\nسيتم تأكيد حجزك خلال 24 ساعة.',
  ],
};

let chatHistory = [
  { role: 'bot', text: 'السلام عليكم! 🕌\nأنا مساعد إيجبت دودو الذكي.\nكيف يمكنني مساعدتك اليوم؟' }
];

function toggleAIChat() {
  const panel = document.getElementById('aiPanel');
  if (panel) panel.classList.toggle('open');
}

function renderChat() {
  const container = document.getElementById('aiMessages');
  if (!container) return;
  container.innerHTML = chatHistory.map(msg => `
    <div class="ai-msg ${msg.role}">
      ${msg.role === 'bot' ? '<div style="width:30px;height:30px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.9rem;flex-shrink:0;">🤖</div>' : ''}
      <div class="ai-msg-bubble">${msg.text.replace(/\n/g, '<br>')}</div>
    </div>`).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendAIMessage() {
  const input = document.getElementById('aiInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  chatHistory.push({ role: 'user', text });
  input.value = '';
  renderChat();

  // Typing indicator
  chatHistory.push({ role: 'bot', text: '...' });
  renderChat();

  await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

  // Smart response
  const lower = text.toLowerCase();
  let response = AI_RESPONSES.default[Math.floor(Math.random() * AI_RESPONSES.default.length)];

  if (/عمرة|umrah/i.test(lower)) response = AI_RESPONSES.umrah[0];
  else if (/حج|hajj/i.test(lower)) response = AI_RESPONSES.hajj[0];
  else if (/سعر|تكلفة|كم|price|cost/i.test(lower)) response = AI_RESPONSES.price[0];
  else if (/تواصل|اتصال|واتساب|contact/i.test(lower)) response = AI_RESPONSES.contact[0];
  else if (/حجز|book/i.test(lower)) response = AI_RESPONSES.booking[0];

  chatHistory[chatHistory.length - 1] = { role: 'bot', text: response };
  renderChat();
}

function onAIKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
}

// ════════════════════════════════════════════
// SMOOTH NAVIGATION
// ════════════════════════════════════════════
function initSmoothNav() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        closeMobileMenu();
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    });
  });
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  loadSiteSettings();
  updateWALinks();
  startTicker();
  initFAQ();
  initRevealObserver();
  animateCounters();
  initHeaderScroll();
  initSmoothNav();
  calculateCost();
  renderChat();

  // Hero cover animation
  const cover = document.getElementById('heroCover');
  if (cover) setTimeout(() => cover.classList.add('loaded'), 100);

  // Keyboard: ESC closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => {
        m.classList.remove('active');
        document.body.style.overflow = '';
      });
      const aiPanel = document.getElementById('aiPanel');
      if (aiPanel?.classList.contains('open')) aiPanel.classList.remove('open');
    }
  });

  console.log('🕌 إيجبت دودو تراڤيل — v3.0 loaded');
});

// ════════════════════════════════════════════
// ADMIN AUTH CHECK (for admin.html)
// ════════════════════════════════════════════
function checkAdminSession() {
  const loggedIn = localStorage.getItem('adminLoggedIn');
  const loginTime = localStorage.getItem('adminLoginTime');
  if (!loggedIn) return false;
  if (loginTime && (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60) > 24) {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    return false;
  }
  return true;
}

function adminLogout() {
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminLoginTime');
  window.location.href = 'index.html';
}

/**
 * إيجبت دودو تراڤيل — Egypt Dodo Travel
 * admin.js — Admin Panel Logic v3.0
 */

'use strict';

// ════════════════════════════════════════════
// ADMIN AUTHENTICATION
// ════════════════════════════════════════════
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'dodo2024'
};

let supabase = null;

function initAdminSupabase() {
  const url = localStorage.getItem('supabase_url') || '';
  const key = localStorage.getItem('supabase_key') || '';
  if (url && key && typeof window.supabase !== 'undefined') {
    try {
      supabase = window.supabase.createClient(url, key);
    } catch (e) { console.warn('Supabase init failed'); }
  }
}

function checkAdminAuth() {
  const loggedIn = localStorage.getItem('adminLoggedIn');
  const loginTime = localStorage.getItem('adminLoginTime');
  if (!loggedIn) { showLoginScreen(); return false; }
  if (loginTime && (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60) > 24) {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    showLoginScreen();
    return false;
  }
  showAdminPanel();
  return true;
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminDashboard').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'flex';
  loadDashboardStats();
}

function adminLogin() {
  const user = document.getElementById('admin-username')?.value.trim();
  const pass = document.getElementById('admin-password')?.value;
  const errEl = document.getElementById('login-error');

  if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
    localStorage.setItem('adminLoggedIn', 'true');
    localStorage.setItem('adminLoginTime', Date.now().toString());
    showAdminPanel();
    if (errEl) errEl.style.display = 'none';
  } else {
    if (errEl) { errEl.textContent = '❌ اسم المستخدم أو كلمة المرور غير صحيحة'; errEl.style.display = 'block'; }
  }
}

function adminLogout() {
  if (!confirm('هل تريد تسجيل الخروج؟')) return;
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminLoginTime');
  showLoginScreen();
}

// ════════════════════════════════════════════
// SECTION NAVIGATION
// ════════════════════════════════════════════
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) { target.classList.add('active'); setTimeout(() => target.scrollTop = 0, 100); }

  const titles = {
    dashboard: '📊 لوحة التحكم',
    bookings: '📋 إدارة الحجوزات',
    trips: '🕌 إدارة الرحلات',
    clients: '👥 إدارة العملاء',
    media: '🖼️ الصور والفيديو',
    reviews: '⭐ إدارة التقييمات',
    cms: '🎨 إدارة المحتوى',
    settings: '⚙️ الإعدادات'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[sectionId] || 'لوحة التحكم';

  document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-menu a[onclick*="${sectionId}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Close sidebar on mobile
  if (window.innerWidth < 992) document.getElementById('sidebar')?.classList.remove('open');

  // Load section data
  const loaders = {
    bookings: loadBookings,
    trips: loadTrips,
    clients: loadClients,
    reviews: loadReviews,
    cms: loadCMSData,
    settings: loadSettings
  };
  if (loaders[sectionId]) loaders[sectionId]();
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

// ════════════════════════════════════════════
// DASHBOARD STATS
// ════════════════════════════════════════════
async function loadDashboardStats() {
  const stats = { bookings: 0, clients: 0, trips: 0, revenue: 0, pending: 0, confirmed: 0 };

  if (supabase) {
    try {
      const [bookRes, clientRes, tripRes] = await Promise.all([
        supabase.from('bookings').select('*'),
        supabase.from('clients').select('id'),
        supabase.from('trips').select('id')
      ]);
      if (!bookRes.error) {
        stats.bookings = bookRes.data.length;
        stats.pending = bookRes.data.filter(b => b.status === 'في الانتظار').length;
        stats.confirmed = bookRes.data.filter(b => b.status === 'مؤكد').length;
      }
      if (!clientRes.error) stats.clients = clientRes.data.length;
      if (!tripRes.error) stats.trips = tripRes.data.length;
    } catch (e) { /* use defaults */ }
  }

  // Fallback demo data
  if (!stats.bookings) { stats.bookings = 47; stats.clients = 183; stats.trips = 12; stats.revenue = 892500; stats.pending = 8; stats.confirmed = 39; }

  setStatEl('stat-bookings', stats.bookings);
  setStatEl('stat-clients', stats.clients);
  setStatEl('stat-trips', stats.trips);
  setStatEl('stat-revenue', stats.revenue.toLocaleString('ar-EG') + ' ج.م');
  setStatEl('stat-pending', stats.pending);
  setStatEl('stat-confirmed', stats.confirmed);

  renderRevenueChart();
}

function setStatEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ════════════════════════════════════════════
// CHARTS
// ════════════════════════════════════════════
let revenueChart = null;

function renderRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  if (revenueChart) { revenueChart.destroy(); }

  const ctx = canvas.getContext('2d');
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const revenue = [45000,62000,58000,91000,115000,134000,98000,76000,142000,168000,205000,189000];
  const bookings = [5,8,7,12,15,18,13,10,19,22,28,25];

  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'الإيرادات (ج.م)',
          data: revenue,
          backgroundColor: 'rgba(212,175,55,0.5)',
          borderColor: '#d4af37',
          borderWidth: 2,
          borderRadius: 8,
          yAxisID: 'y',
        },
        {
          label: 'الحجوزات',
          data: bookings,
          type: 'line',
          borderColor: '#667eea',
          backgroundColor: 'rgba(102,126,234,0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#667eea',
          pointRadius: 5,
          tension: 0.4,
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#a0aec0', font: { family: 'Cairo', size: 13 } } },
        tooltip: {
          backgroundColor: '#0d1220',
          borderColor: 'rgba(212,175,55,0.3)',
          borderWidth: 1,
          titleColor: '#d4af37',
          bodyColor: '#a0aec0',
        }
      },
      scales: {
        x: { ticks: { color: '#a0aec0', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#a0aec0', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' }, position: 'right' },
        y1: { ticks: { color: '#667eea', font: { family: 'Cairo' } }, grid: { display: false }, position: 'left' }
      }
    }
  });
}

// ════════════════════════════════════════════
// BOOKINGS
// ════════════════════════════════════════════
let allBookings = [];

async function loadBookings() {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px"><span class="spinner"></span></td></tr>';

  if (supabase) {
    try {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (!error && data) { allBookings = data; renderBookingsTable(data); return; }
    } catch (e) { /* fallback */ }
  }

  // Demo data
  allBookings = [
    { id: 1, name: 'أحمد محمد السيد', phone: '01234567890', package: 'عمرة البريميوم', people: 2, travel_date: '2025-03-15', status: 'مؤكد', created_at: '2025-01-10T10:00:00Z' },
    { id: 2, name: 'فاطمة علي حسن', phone: '01098765432', package: 'رحلة الحج', people: 4, travel_date: '2025-06-01', status: 'في الانتظار', created_at: '2025-01-12T14:30:00Z' },
    { id: 3, name: 'محمود عبد الله', phone: '01111222333', package: 'عمرة الاقتصادية', people: 1, travel_date: '2025-02-20', status: 'مكتمل', created_at: '2025-01-08T09:15:00Z' },
    { id: 4, name: 'سارة خالد النور', phone: '01555666777', package: 'عمرة رمضان', people: 3, travel_date: '2025-03-25', status: 'مؤكد', created_at: '2025-01-14T16:00:00Z' },
    { id: 5, name: 'عمر إبراهيم طه', phone: '01022334455', package: 'عمرة البريميوم', people: 2, travel_date: '2025-04-10', status: 'في الانتظار', created_at: '2025-01-15T11:45:00Z' },
  ];
  renderBookingsTable(allBookings);
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-sec)">لا توجد حجوزات</td></tr>';
    return;
  }
  const statusColors = { 'مؤكد': 'success', 'في الانتظار': 'warning', 'مكتمل': 'primary', 'ملغي': 'danger' };
  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td>#${b.id}</td>
      <td><strong>${b.name}</strong></td>
      <td>${b.phone}</td>
      <td>${b.package || '-'}</td>
      <td>${b.people || 1}</td>
      <td>${b.travel_date ? new Date(b.travel_date).toLocaleDateString('ar-EG') : '-'}</td>
      <td><span class="status-badge status-${statusColors[b.status] || 'warning'}">${b.status}</span></td>
      <td>
        <div class="table-actions">
          <button class="action-btn action-edit" onclick="editBooking(${b.id})" title="تعديل"><i class="fas fa-edit"></i></button>
          <button class="action-btn action-wa" onclick="contactBookingWA('${b.phone}','${b.name}')" title="واتساب"><i class="fab fa-whatsapp"></i></button>
          <button class="action-btn action-delete" onclick="confirmDelete(${b.id},'booking')" title="حذف"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function filterBookings() {
  const search = document.getElementById('booking-search')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('booking-status-filter')?.value || '';
  let filtered = allBookings.filter(b => {
    const matchSearch = !search || b.name?.toLowerCase().includes(search) || b.phone?.includes(search);
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  });
  renderBookingsTable(filtered);
}

function contactBookingWA(phone, name) {
  const msg = `السلام عليكم ${name}، نتواصل معك من إيجبت دودو تراڤيل بخصوص حجزك.`;
  const num = phone.replace(/[^0-9]/g, '');
  const intlNum = num.startsWith('0') ? '2' + num : num;
  window.open(`https://wa.me/${intlNum}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function editBooking(id) {
  const booking = allBookings.find(b => b.id == id);
  if (!booking) return;
  const newStatus = prompt(`تغيير حالة حجز ${booking.name}:\n\nأدخل الحالة الجديدة:\n- مؤكد\n- في الانتظار\n- مكتمل\n- ملغي`, booking.status);
  if (!newStatus) return;

  if (supabase) {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    if (error) { alert('فشل التحديث: ' + error.message); return; }
  }
  booking.status = newStatus;
  renderBookingsTable(allBookings);
  showAdminAlert('success', '✅ تم تحديث الحجز بنجاح');
}

// ════════════════════════════════════════════
// TRIPS
// ════════════════════════════════════════════
let allTrips = [];

async function loadTrips() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('trips').select('*');
      if (!error && data) { allTrips = data; renderTripsGrid(data); return; }
    } catch (e) { /* fallback */ }
  }
  allTrips = [
    { id: 1, name: 'عمرة الاقتصادية', icon: '✈️', price: '8,500', stars: 3, available: true, seats: 20 },
    { id: 2, name: 'عمرة البريميوم', icon: '💎', price: '18,000', stars: 4, available: true, seats: 12 },
    { id: 3, name: 'عمرة رمضان', icon: '🌙', price: '22,000', stars: 5, available: true, seats: 8 },
    { id: 4, name: 'رحلة الحج', icon: '🕋', price: '45,000', stars: 5, available: false, seats: 0 },
  ];
  renderTripsGrid(allTrips);
}

function renderTripsGrid(trips) {
  const container = document.getElementById('trips-grid');
  if (!container) return;
  container.innerHTML = trips.map(t => `
    <div class="trip-card card-3d">
      <div class="trip-header">
        <span style="font-size:2.5rem">${t.icon || '🕌'}</span>
        <div>
          <h3>${t.name}</h3>
          <div style="color:var(--primary)">${'★'.repeat(t.stars || 3)}</div>
        </div>
        <span class="status-badge ${t.available ? 'status-success' : 'status-danger'}">${t.available ? 'متاح' : 'مكتمل'}</span>
      </div>
      <div class="trip-body">
        <div class="trip-stat"><i class="fas fa-tag"></i> <strong>${t.price} ج.م</strong></div>
        <div class="trip-stat"><i class="fas fa-chair"></i> ${t.seats || 0} مقعد متاح</div>
      </div>
      <div class="trip-actions">
        <button class="action-btn action-edit" onclick="editTrip(${t.id})"><i class="fas fa-edit"></i> تعديل</button>
        <button class="action-btn action-delete" onclick="confirmDelete(${t.id},'trip')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
}

function editTrip(id) {
  const trip = allTrips.find(t => t.id == id);
  if (!trip) return;
  const newPrice = prompt(`تعديل سعر "${trip.name}":`, trip.price);
  if (!newPrice) return;
  trip.price = newPrice;
  renderTripsGrid(allTrips);
  showAdminAlert('success', '✅ تم تحديث الرحلة');
}

// ════════════════════════════════════════════
// CLIENTS
// ════════════════════════════════════════════
let allClients = [];

async function loadClients() {
  const tbody = document.getElementById('clients-tbody');
  if (!tbody) return;

  if (supabase) {
    try {
      const { data, error } = await supabase.from('clients').select('*');
      if (!error && data) { allClients = data; renderClientsTable(data); return; }
    } catch (e) { /* fallback */ }
  }

  allClients = [
    { id: 1, name: 'أحمد محمد السيد', phone: '01234567890', email: 'ahmed@email.com', trips: 3, total_spent: 54000, last_trip: '2025-01-10' },
    { id: 2, name: 'فاطمة علي حسن', phone: '01098765432', email: 'fatma@email.com', trips: 1, total_spent: 45000, last_trip: '2025-01-12' },
    { id: 3, name: 'محمود عبد الله', phone: '01111222333', email: '', trips: 5, total_spent: 42500, last_trip: '2025-01-08' },
    { id: 4, name: 'سارة خالد', phone: '01555666777', email: 'sara@email.com', trips: 2, total_spent: 36000, last_trip: '2025-01-14' },
  ];
  renderClientsTable(allClients);
}

function renderClientsTable(clients) {
  const tbody = document.getElementById('clients-tbody');
  if (!tbody) return;
  tbody.innerHTML = clients.map(c => `
    <tr>
      <td>#${c.id}</td>
      <td><strong>${c.name}</strong></td>
      <td>${c.phone}</td>
      <td>${c.email || '-'}</td>
      <td>${c.trips || 0}</td>
      <td style="color:var(--primary)">${(c.total_spent || 0).toLocaleString('ar-EG')} ج.م</td>
      <td>${c.last_trip ? new Date(c.last_trip).toLocaleDateString('ar-EG') : '-'}</td>
      <td>
        <div class="table-actions">
          <button class="action-btn action-wa" onclick="contactClientWA('${c.phone}','${c.name}')" title="واتساب"><i class="fab fa-whatsapp"></i></button>
          <button class="action-btn action-delete" onclick="confirmDelete(${c.id},'client')" title="حذف"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function filterClients() {
  const search = document.getElementById('client-search')?.value.toLowerCase() || '';
  const filtered = allClients.filter(c =>
    !search || c.name?.toLowerCase().includes(search) || c.phone?.includes(search)
  );
  renderClientsTable(filtered);
}

function contactClientWA(phone, name) {
  const msg = `السلام عليكم ${name}، نتواصل معك من إيجبت دودو تراڤيل. 🕌`;
  const num = phone.replace(/[^0-9]/g, '');
  const intlNum = num.startsWith('0') ? '2' + num : num;
  window.open(`https://wa.me/${intlNum}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════
async function loadReviews() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (!error && data) { renderReviews(data); return; }
    } catch (e) { /* fallback */ }
  }
  renderReviews([
    { id: 1, name: 'أحمد السيد', rating: 5, comment: 'تجربة رائعة لا تُنسى! الخدمة كانت ممتازة وفريق العمل محترف جداً.', trip: 'عمرة البريميوم', date: '2025-01-10', approved: true },
    { id: 2, name: 'فاطمة حسن', rating: 5, comment: 'رحلة مميزة جداً والحمد لله. سأحجز معكم مرة أخرى إن شاء الله.', trip: 'رحلة الحج', date: '2025-01-08', approved: true },
    { id: 3, name: 'محمد علي', rating: 4, comment: 'خدمة جيدة والتنظيم كان ممتاز.', trip: 'عمرة الاقتصادية', date: '2025-01-05', approved: false },
  ]);
}

function renderReviews(reviews) {
  const container = document.getElementById('reviews-container');
  if (!container) return;
  container.innerHTML = reviews.map(r => `
    <div class="review-card card-3d" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:14px">
        <div>
          <strong>${r.name}</strong>
          <div style="color:var(--primary);font-size:1.1rem;letter-spacing:3px">${'★'.repeat(r.rating || 5)}</div>
        </div>
        <span class="status-badge ${r.approved ? 'status-success' : 'status-warning'}">${r.approved ? 'معتمد' : 'في الانتظار'}</span>
      </div>
      <p style="color:var(--text-sec);margin-bottom:12px">"${r.comment}"</p>
      <div style="display:flex;gap:16px;align-items:center;font-size:0.85rem;color:var(--text-muted)">
        <span><i class="fas fa-suitcase"></i> ${r.trip || ''}</span>
        <span><i class="fas fa-calendar"></i> ${r.date ? new Date(r.date).toLocaleDateString('ar-EG') : ''}</span>
      </div>
      <div class="trip-actions" style="margin-top:14px">
        ${!r.approved ? `<button class="action-btn action-edit" onclick="approveReview(${r.id})"><i class="fas fa-check"></i> اعتماد</button>` : ''}
        <button class="action-btn action-delete" onclick="confirmDelete(${r.id},'review')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
}

async function approveReview(id) {
  if (supabase) {
    await supabase.from('reviews').update({ approved: true }).eq('id', id);
  }
  showAdminAlert('success', '✅ تم اعتماد التقييم');
  loadReviews();
}

// ════════════════════════════════════════════
// CMS
// ════════════════════════════════════════════
let cmsData = {
  logoUrl: '', coverUrl: '',
  whatsapp: '01093319693', phone: '', email: '', address: '', hours: '', welcome: '',
  marketingMessages: [], packages: []
};

async function loadCMSData() {
  const cached = localStorage.getItem('siteSettings');
  if (cached) { try { cmsData = { ...cmsData, ...JSON.parse(cached) }; } catch(e) {} }
  renderCMSForm();

  if (!supabase) return;
  try {
    const { data, error } = await supabase.from('site_settings').select('*').single();
    if (!error && data?.settings) {
      cmsData = { ...cmsData, ...data.settings };
      renderCMSForm();
    }
  } catch (e) { /* use cached */ }
}

function renderCMSForm() {
  const map = { 'logo-url':'logoUrl','cover-url':'coverUrl','whatsapp':'whatsapp','phone':'phone','email':'email','address':'address','hours':'hours','welcome':'welcome' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(`cms-${id}`);
    if (el && cmsData[key]) el.value = cmsData[key];
  });
  if (cmsData.logoUrl) showPreview('logo', cmsData.logoUrl);
  if (cmsData.coverUrl) showPreview('cover', cmsData.coverUrl);

  const defaultMsgs = [
    { icon:'🕋', label:'عروض الحج 2025', text:'أماكن محدودة! سارع بالحجز الآن وضمن مكانك في رحلة العمر' },
    { icon:'🌙', label:'عمرة رمضان المبارك', text:'عيش تجربة روحانية لا تُنسى في أقدس البقاع' },
    { icon:'🎁', label:'عرض خاص للعائلات', text:'خصم 10% عند حجز 3 أفراد أو أكثر — تواصل معنا الآن!' },
  ];
  const defaultPkgs = [
    { icon:'✈️', name:'عمرة الاقتصادية', price:'8,500', stars:3 },
    { icon:'💎', name:'عمرة البريميوم', price:'18,000', stars:4 },
    { icon:'🌙', name:'عمرة رمضان', price:'22,000', stars:5 },
    { icon:'🕋', name:'رحلة الحج', price:'45,000', stars:5 },
  ];
  renderMsgList(cmsData.marketingMessages?.length ? cmsData.marketingMessages : defaultMsgs);
  renderPackageList(cmsData.packages?.length ? cmsData.packages : defaultPkgs);
}

function showPreview(type, url) {
  const preview = document.getElementById(`cms-${type}-preview`);
  const img = document.getElementById(`cms-${type}-img`);
  if (preview && img && url) { img.src = url; preview.style.display = 'block'; }
}

function previewAndUpload(type, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    showPreview(type, e.target.result);
    const urlInput = document.getElementById(`cms-${type}-url`);
    if (urlInput) urlInput.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderMsgList(msgs) {
  cmsData.marketingMessages = msgs;
  const c = document.getElementById('cms-messages-list');
  if (!c) return;
  c.innerHTML = msgs.map((m, i) => `
    <div class="cms-row">
      <input type="text" value="${m.icon||'✨'}" class="form-input" style="width:65px;text-align:center;font-size:1.3rem" onchange="updateMsg(${i},'icon',this.value)">
      <input type="text" value="${m.label||''}" class="form-input" onchange="updateMsg(${i},'label',this.value)" placeholder="العنوان">
      <input type="text" value="${m.text||''}" class="form-input" onchange="updateMsg(${i},'text',this.value)" placeholder="النص">
      <button onclick="removeMsg(${i})" class="action-btn action-delete"><i class="fas fa-trash"></i></button>
    </div>`).join('');
}

function updateMsg(i, field, val) { if (cmsData.marketingMessages[i]) cmsData.marketingMessages[i][field] = val; }
function removeMsg(i) { cmsData.marketingMessages.splice(i, 1); renderMsgList(cmsData.marketingMessages); }
function addMarketingMsg() {
  if (!cmsData.marketingMessages) cmsData.marketingMessages = [];
  cmsData.marketingMessages.push({ icon:'✨', label:'رسالة جديدة', text:'أضف نص رسالتك هنا...' });
  renderMsgList(cmsData.marketingMessages);
}

function renderPackageList(pkgs) {
  cmsData.packages = pkgs;
  const c = document.getElementById('cms-packages-list');
  if (!c) return;
  c.innerHTML = pkgs.map((p, i) => `
    <div class="cms-row">
      <input type="text" value="${p.icon||'🕌'}" class="form-input" style="width:65px;text-align:center;font-size:1.3rem" onchange="updatePkg(${i},'icon',this.value)">
      <input type="text" value="${p.name||''}" class="form-input" onchange="updatePkg(${i},'name',this.value)" placeholder="اسم البرنامج">
      <input type="text" value="${p.price||''}" class="form-input" onchange="updatePkg(${i},'price',this.value)" placeholder="السعر">
      <input type="number" value="${p.stars||3}" min="1" max="5" class="form-input" style="width:80px" onchange="updatePkg(${i},'stars',this.value)">
      <button onclick="removePkg(${i})" class="action-btn action-delete"><i class="fas fa-trash"></i></button>
    </div>`).join('');
}

function updatePkg(i, field, val) { if (cmsData.packages[i]) cmsData.packages[i][field] = val; }
function removePkg(i) { cmsData.packages.splice(i, 1); renderPackageList(cmsData.packages); }
function addPackage() {
  if (!cmsData.packages) cmsData.packages = [];
  cmsData.packages.push({ icon:'🕌', name:'برنامج جديد', price:'0', stars:3 });
  renderPackageList(cmsData.packages);
}

async function saveCMS() {
  const map = { 'logo-url':'logoUrl','cover-url':'coverUrl','whatsapp':'whatsapp','phone':'phone','email':'email','address':'address','hours':'hours','welcome':'welcome' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(`cms-${id}`);
    if (el) cmsData[key] = el.value.trim();
  });
  localStorage.setItem('siteSettings', JSON.stringify(cmsData));

  if (supabase) {
    try {
      const { error } = await supabase.from('site_settings').upsert([{ id: 1, settings: cmsData }]);
      if (error) throw error;
      showAdminAlert('success', '✅ تم حفظ المحتوى وسيظهر فوراً في الموقع!');
    } catch (err) {
      showAdminAlert('success', '✅ تم الحفظ محلياً بنجاح');
    }
  } else {
    showAdminAlert('success', '✅ تم الحفظ محلياً بنجاح');
  }
}

function previewSite() { window.open('index.html', '_blank'); }

// ════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════
function loadSettings() {
  const url = localStorage.getItem('supabase_url') || '';
  const key = localStorage.getItem('supabase_key') || '';
  const urlEl = document.getElementById('settings-sb-url');
  const keyEl = document.getElementById('settings-sb-key');
  if (urlEl) urlEl.value = url;
  if (keyEl) keyEl.value = key;
}

function saveSettings() {
  const url = document.getElementById('settings-sb-url')?.value.trim();
  const key = document.getElementById('settings-sb-key')?.value.trim();
  if (url) localStorage.setItem('supabase_url', url);
  if (key) localStorage.setItem('supabase_key', key);
  const newPass = document.getElementById('settings-new-pass')?.value;
  if (newPass && newPass.length >= 6) {
    ADMIN_CREDENTIALS.password = newPass;
    showAdminAlert('success', '✅ تم تغيير كلمة المرور بنجاح');
  }
  showAdminAlert('success', '✅ تم حفظ الإعدادات. ستحتاج لإعادة تحميل الصفحة لتطبيق التغييرات.');
}

// ════════════════════════════════════════════
// DELETE CONFIRMATION
// ════════════════════════════════════════════
let deleteCallback = null;

function confirmDelete(id, type) {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.classList.add('active');
  deleteCallback = async () => {
    if (supabase) {
      const tables = { booking: 'bookings', client: 'clients', trip: 'trips', review: 'reviews' };
      if (tables[type]) await supabase.from(tables[type]).delete().eq('id', id);
    }
    closeConfirmModal();
    showAdminAlert('success', '✅ تم الحذف بنجاح');
    const reloaders = { booking: loadBookings, client: loadClients, trip: loadTrips, review: loadReviews };
    if (reloaders[type]) reloaders[type]();
  };
}

function executeDelete() { if (deleteCallback) deleteCallback(); }
function closeConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.classList.remove('active');
  deleteCallback = null;
}

// ════════════════════════════════════════════
// ADMIN ALERTS
// ════════════════════════════════════════════
function showAdminAlert(type, message) {
  const el = document.getElementById('admin-alert');
  if (!el) return;
  el.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
  el.textContent = message;
  el.style.display = 'block';
  if (type !== 'error') setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════
function exportBookings() {
  if (!allBookings.length) { showAdminAlert('error', 'لا توجد بيانات للتصدير'); return; }
  const headers = ['#','الاسم','الهاتف','البرنامج','الأفراد','تاريخ السفر','الحالة','تاريخ الحجز'];
  const rows = allBookings.map(b => [b.id, b.name, b.phone, b.package || '', b.people || 1, b.travel_date || '', b.status || '', b.created_at ? new Date(b.created_at).toLocaleDateString('ar-EG') : '']);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `egypt-dodo-bookings-${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`;
  link.click();
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initAdminSupabase();
  checkAdminAuth();

  // Enter key on login
  document.getElementById('admin-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminLogin();
  });

  // Close modals on backdrop
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) { m.classList.remove('active'); }
    });
  });

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });
});

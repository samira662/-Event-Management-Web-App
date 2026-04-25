// ===================================================
//  EventFlow - Main JavaScript App
// ===================================================

const API_BASE = './php';

// ===================================================
//  Core fetch - works with PHP sessions
// ===================================================
async function apiFetch(url, body = null) {
  try {
    const opts = {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: {}
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res  = await fetch(url, opts);
    const text = await res.text();
    if (!text.trim()) return { success: false, message: 'Empty response from server' };
    try {
      return JSON.parse(text);
    } catch(e) {
      console.error('PHP error:', text.substring(0, 300));
      return { success: false, message: 'PHP error - check browser console' };
    }
  } catch(e) {
    console.error('Network error:', e);
    return { success: false, message: 'Network error: ' + e.message };
  }
}

const API = {
  auth:   (action, data) => apiFetch(`${API_BASE}/auth.php?action=${action}`, data || null),
  events: (action, data, params = {}) => {
    const qs = new URLSearchParams({ action, ...params }).toString();
    return apiFetch(`${API_BASE}/events.php?${qs}`, data || null);
  }
};

// ===================================================
//  State
// ===================================================
const state = {
  user: null,
  currentPage: 'home',
  events: [], totalEvents: 0,
  currentEvent: null,
  filters: { search: '', category: '', status: '', sort: 'start_date', order: 'ASC' },
  pagination: { limit: 9, offset: 0 },
  stats: {}
};

// ===================================================
//  Toast
// ===================================================
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-msg">${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">×</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => { if(el.parentElement) el.remove(); }, 4500);
}

// ===================================================
//  Router
// ===================================================
function navigateTo(page, data = null) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  const el = document.getElementById('page-' + page);
  if (!el) return;
  el.classList.add('active');
  state.currentPage = page;
  window.scrollTo(0, 0);
  const init = {
    'home':         initHomePage,
    'events':       initEventsPage,
    'dashboard':    initDashboard,
    'event-detail': () => initEventDetail(data),
    'create-event': initCreateEvent
  };
  if (init[page]) init[page]();
}

// ===================================================
//  Auth check
// ===================================================
async function checkAuth() {
  const res = await API.auth('me');
  if (res.success && res.data) {
    state.user = res.data;
    updateNavUI();
  }
}

function updateNavUI() {
  const guestNav = document.getElementById('guestNav');
  const userNav  = document.getElementById('userNav');
  if (state.user) {
    guestNav.classList.add('hidden');
    userNav.classList.remove('hidden');
    document.getElementById('navUserName').textContent = state.user.name.split(' ')[0];
    document.getElementById('navAvatar').textContent   = state.user.name.charAt(0).toUpperCase();
    if (state.user.role === 'admin') document.getElementById('adminLink')?.classList.remove('hidden');
  } else {
    guestNav.classList.remove('hidden');
    userNav.classList.add('hidden');
    document.getElementById('adminLink')?.classList.add('hidden');
  }
}

// ===================================================
//  LOGIN
// ===================================================
async function handleLogin(e) {
  e.preventDefault();
  const btn   = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value.trim();

  if (!email || !pass) { toast('Please enter email and password', 'error'); return; }

  btn.disabled = true; btn.textContent = 'Signing in...';
  const res = await API.auth('login', { email: email, password: pass });
  btn.disabled = false; btn.textContent = 'Sign In';

  if (res.success) {
    state.user = res.data;
    updateNavUI();
    closeModal('authModal');
    toast('Welcome back, ' + res.data.name + '! 🎉', 'success');
    navigateTo('home');
  } else {
    toast(res.message || 'Login failed', 'error');
  }
}

// ===================================================
//  REGISTER
// ===================================================
async function handleRegister(e) {
  e.preventDefault();
  const btn  = document.getElementById('registerBtn');
  const name = document.getElementById('regName').value.trim();
  const email= document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPassword').value.trim();

  if (!name)  { toast('Please enter your name', 'error'); return; }
  if (!email) { toast('Please enter your email', 'error'); return; }
  if (!pass)  { toast('Please enter a password', 'error'); return; }
  if (pass.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

  btn.disabled = true; btn.textContent = 'Creating...';
  const res = await API.auth('register', { name: name, email: email, password: pass });
  btn.disabled = false; btn.textContent = 'Create Account';

  if (res.success) {
    state.user = res.data;
    updateNavUI();
    closeModal('authModal');
    toast('Welcome to EventFlow, ' + res.data.name + '! 🎉', 'success');
    navigateTo('home');
  } else {
    toast(res.message || 'Registration failed', 'error');
  }
}

// ===================================================
//  LOGOUT
// ===================================================
async function handleLogout() {
  await API.auth('logout');
  state.user = null;
  updateNavUI();
  toast('Logged out successfully', 'info');
  navigateTo('home');
}

// ===================================================
//  Home Page
// ===================================================
async function initHomePage() {
  // Featured events
  const res = await API.events('list', null, { limit: 6, sort: 'start_date', order: 'ASC', status: 'upcoming' });
  if (res.success) renderEventsGrid('featuredEvents', res.data.events);

  // Stats
  const sr = await API.events('stats');
  if (sr.success) {
    document.getElementById('statEvents').textContent       = sr.data.total_events       || 0;
    document.getElementById('statUsers').textContent        = sr.data.total_users        || 0;
    document.getElementById('statRegistrations').textContent= sr.data.total_registrations|| 0;
  }

  // Categories
  const cr = await API.events('categories');
  if (cr.success) renderCategories('categoriesGrid', cr.data.slice(0, 8));
}

function renderCategories(id, cats) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!cats || cats.length === 0) { el.innerHTML = '<p style="color:var(--text-muted)">No categories found</p>'; return; }
  el.innerHTML = cats.map(c => `
    <div class="category-card" onclick="filterByCategory('${c.name}')">
      <div class="category-icon">${c.icon || '📅'}</div>
      <div class="category-name">${c.name}</div>
      <div class="category-count">${c.event_count || 0} events</div>
    </div>`).join('');
}

function filterByCategory(cat) {
  state.filters.category = cat;
  navigateTo('events');
}

// ===================================================
//  Events Page
// ===================================================
async function initEventsPage() {
  await loadCategories();
  await loadEvents();
  bindEventFilters();
}

async function loadCategories() {
  const res = document.getElementById('categoryFilters');
  if (!res) return;
  const r = await API.events('categories');
  if (!r.success) return;
  res.innerHTML =
    `<button class="filter-chip ${!state.filters.category?'active':''}" onclick="setCategoryFilter('')">All</button>` +
    r.data.map(c =>
      `<button class="filter-chip ${state.filters.category===c.name?'active':''}" onclick="setCategoryFilter('${c.name}')">${c.icon} ${c.name}</button>`
    ).join('');
}

function setCategoryFilter(cat) {
  state.filters.category = cat;
  state.pagination.offset = 0;
  document.querySelectorAll('#categoryFilters .filter-chip').forEach(b => {
    b.classList.toggle('active', (cat===''&&b.textContent.trim()==='All') || b.textContent.trim().includes(cat) && cat!=='');
  });
  loadEvents();
}

function bindEventFilters() {
  const si = document.getElementById('searchInput');
  if (si) {
    si.value = state.filters.search;
    let t;
    si.addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => { state.filters.search = e.target.value; state.pagination.offset=0; loadEvents(); }, 400);
    });
  }
  const sf = document.getElementById('statusFilter');
  if (sf) { sf.value = state.filters.status; sf.addEventListener('change', e => { state.filters.status=e.target.value; loadEvents(); }); }
  const so = document.getElementById('sortFilter');
  if (so) { so.addEventListener('change', e => { state.filters.sort=e.target.value; loadEvents(); }); }
}

async function loadEvents() {
  const container = document.getElementById('eventsGrid');
  if (!container) return;
  container.innerHTML = '<div class="loader"><div class="spinner"></div><p>Loading events...</p></div>';
  const params = { limit: state.pagination.limit, offset: state.pagination.offset, ...state.filters };
  const res = await API.events('list', null, params);
  if (res.success) {
    state.events = res.data.events;
    state.totalEvents = res.data.total;
    renderEventsGrid('eventsGrid', state.events);
    renderPagination();
    const c = document.getElementById('eventsCount');
    if (c) c.textContent = state.totalEvents + ' events found';
  } else {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">Failed to load events</div><div class="empty-sub">' + (res.message||'') + '</div></div>';
  }
}

function renderEventsGrid(containerId, events) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!events || events.length === 0) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📅</div><div class="empty-title">No events found</div><div class="empty-sub">Try different filters</div></div>`;
    return;
  }
  el.innerHTML = events.map(ev => createEventCard(ev)).join('');
}

function createEventCard(ev) {
  const emojis = {Conference:'🎤',Workshop:'🛠️',Concert:'🎵',Sports:'⚽',Networking:'🤝',Exhibition:'🖼️',Webinar:'💻',Festival:'🎉'};
  const emoji  = emojis[ev.category] || '📅';
  const price  = parseFloat(ev.price||0)===0 ? `<span class="event-price free">FREE</span>` : `<span class="event-price">$${parseFloat(ev.price).toFixed(2)}</span>`;
  const cap    = ev.capacity>0 ? `${ev.registered_count||0}/${ev.capacity}` : 'Unlimited';
  const date   = ev.start_date ? new Date(ev.start_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'TBD';
  const img    = ev.image ? `<img src="${ev.image}" alt="${ev.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=event-card-image-placeholder>${emoji}</div>'">` : `<div class="event-card-image-placeholder">${emoji}</div>`;
  return `<div class="event-card" onclick="openEventDetail(${ev.id})">
    <div class="event-card-image">${img}<span class="event-card-badge badge-${ev.status}">${ev.status}</span></div>
    <div class="event-card-body">
      <div class="event-card-category">${ev.category||'General'}</div>
      <div class="event-card-title">${ev.title}</div>
      <div class="event-card-meta">
        <div class="event-card-meta-item">📅 ${date}${ev.start_time?' · '+formatTime(ev.start_time):''}</div>
        <div class="event-card-meta-item">📍 ${ev.location||'TBD'}</div>
      </div>
      <div class="event-card-footer">${price}<span class="event-capacity">👥 ${cap}</span></div>
    </div>
  </div>`;
}

function renderPagination() {
  const c = document.getElementById('pagination');
  if (!c) return;
  const total = Math.ceil(state.totalEvents / state.pagination.limit);
  const cur   = Math.floor(state.pagination.offset / state.pagination.limit) + 1;
  if (total <= 1) { c.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${cur===1?'disabled':''} onclick="changePage(${cur-1})">‹</button>`;
  for (let i=1; i<=total; i++) {
    if (i===1||i===total||(i>=cur-1&&i<=cur+1)) html += `<button class="page-btn ${i===cur?'active':''}" onclick="changePage(${i})">${i}</button>`;
    else if (i===cur-2||i===cur+2) html += `<span style="color:var(--text-muted);padding:0 .25rem">…</span>`;
  }
  html += `<button class="page-btn" ${cur===total?'disabled':''} onclick="changePage(${cur+1})">›</button>`;
  c.innerHTML = html;
}

function changePage(p) {
  state.pagination.offset = (p-1)*state.pagination.limit;
  loadEvents();
  document.getElementById('page-events')?.scrollIntoView();
}

// ===================================================
//  Event Detail
// ===================================================
async function openEventDetail(id) { navigateTo('event-detail', id); }

async function initEventDetail(id) {
  if (!id) return;
  const c = document.getElementById('eventDetailContent');
  c.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  const res = await API.events('get', null, { id });
  if (!res.success) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">Event not found</div></div>'; return; }
  state.currentEvent = res.data;
  renderEventDetail(res.data);
}

function renderEventDetail(ev) {
  const emojis = {Conference:'🎤',Workshop:'🛠️',Concert:'🎵',Sports:'⚽',Networking:'🤝',Exhibition:'🖼️',Webinar:'💻',Festival:'🎉'};
  const emoji   = emojis[ev.category]||'📅';
  const dateStr = ev.start_date ? new Date(ev.start_date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : 'TBD';
  const reg     = parseInt(ev.registered_count)||0;
  const cap     = parseInt(ev.capacity)||0;
  const pct     = cap>0 ? Math.min(100,Math.round(reg/cap*100)) : 0;
  const isFree  = parseFloat(ev.price||0)===0;
  const soldOut = cap>0 && reg>=cap;

  let regBtn = '';
  if (ev.status==='upcoming') {
    if (!state.user) {
      regBtn = `<button class="btn btn-primary w-full" onclick="showAuth()">Sign in to Register</button>`;
    } else if (ev.is_registered) {
      regBtn = `<button class="btn btn-danger w-full" onclick="doUnregister(${ev.id})">Cancel Registration</button>
                <p style="color:var(--green);text-align:center;font-size:.8rem;margin-top:.5rem">✓ You are registered!</p>`;
    } else if (soldOut) {
      regBtn = `<button class="btn btn-secondary w-full" disabled>Sold Out</button>`;
    } else {
      regBtn = `<button class="btn btn-primary w-full" onclick="doRegister(${ev.id})">Register Now →</button>`;
    }
  } else {
    regBtn = `<button class="btn btn-secondary w-full" disabled>Registration Closed</button>`;
  }

  document.getElementById('eventDetailContent').innerHTML = `
    <div class="event-detail-hero">
      ${ev.image?`<img src="${ev.image}" alt="${ev.title}">`:`<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:6rem;">${emoji}</div>`}
      <div class="event-detail-hero-overlay"></div>
    </div>
    <div class="event-detail-content">
      <div class="event-detail-header">
        <div>
          <div class="event-detail-category">${ev.category||'General'}</div>
          <h1 class="event-detail-title">${ev.title}</h1>
          <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap">
            <span class="event-card-badge badge-${ev.status}" style="position:static">${ev.status}</span>
            <span style="color:var(--text-muted);font-size:.875rem">by ${ev.organizer_name||'EventFlow'}</span>
          </div>
        </div>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('events')">← Back</button>
          ${state.user&&(state.user.role==='admin'||state.user.id==ev.organizer_id)?`<button class="btn btn-outline btn-sm" onclick="openEditEvent(${ev.id})">✏️ Edit</button>`:''}
        </div>
      </div>
      <div class="event-detail-body">
        <div>
          <h3 style="margin-bottom:1rem">About This Event</h3>
          <p style="color:var(--text-secondary);line-height:1.8">${ev.description||'No description provided.'}</p>
        </div>
        <div class="event-info-card">
          <div class="event-info-row"><span class="event-info-icon">📅</span><div><div class="event-info-label">Date</div><div class="event-info-value">${dateStr}</div></div></div>
          ${ev.start_time?`<div class="event-info-row"><span class="event-info-icon">⏰</span><div><div class="event-info-label">Time</div><div class="event-info-value">${formatTime(ev.start_time)}${ev.end_time?' – '+formatTime(ev.end_time):''}</div></div></div>`:''}
          <div class="event-info-row"><span class="event-info-icon">📍</span><div><div class="event-info-label">Location</div><div class="event-info-value">${ev.venue?ev.venue+', ':''}${ev.location||'TBD'}</div></div></div>
          ${cap>0?`<div class="event-info-row"><span class="event-info-icon">👥</span><div style="width:100%"><div class="event-info-label">Capacity</div><div class="event-info-value">${reg} / ${cap}</div><div class="capacity-bar" style="margin-top:.5rem"><div class="capacity-fill" style="width:${pct}%"></div></div></div></div>`:''}
          <div class="register-price ${isFree?'free':''}">${isFree?'FREE':'$'+parseFloat(ev.price).toFixed(2)}</div>
          ${regBtn}
        </div>
      </div>
    </div>`;
}

async function doRegister(eventId) {
  if (!state.user) { showAuth(); return; }
  const res = await API.events('register', { event_id: eventId });
  if (res.success) { toast('Registered successfully! 🎉', 'success'); initEventDetail(eventId); }
  else toast(res.message||'Failed', 'error');
}

async function doUnregister(eventId) {
  if (!confirm('Cancel your registration?')) return;
  const res = await apiFetch(`./php/events.php?action=unregister&event_id=${eventId}`);
  if (res.success) { toast('Registration cancelled', 'info'); initEventDetail(eventId); }
  else toast(res.message||'Failed', 'error');
}

// ===================================================
//  Dashboard
// ===================================================
async function initDashboard() {
  if (!state.user) { showAuth(); return; }
  document.getElementById('dashUserName').textContent = state.user.name;
  document.getElementById('dashUserRole').textContent = state.user.role==='admin' ? '🛡️ Administrator' : '👤 Member';
  if (state.user.role==='admin') document.getElementById('adminTabBtn').style.display='';

  await Promise.all([loadDashStats(), loadMyReg(), loadMyEv()]);
  if (state.user.role==='admin') loadAdminEvents();
}

async function loadDashStats() {
  const [sr, er, rr] = await Promise.all([API.events('stats'), API.events('my_events'), API.events('my_registrations')]);
  if (sr.success) {
    document.getElementById('dashTotalEvents').textContent = sr.data.total_events||0;
    document.getElementById('dashTotalUsers').textContent  = sr.data.total_users||0;
    document.getElementById('dashTotalReg').textContent    = sr.data.total_registrations||0;
  }
  if (er.success) document.getElementById('dashMyEvents').textContent = er.data.length;
  if (rr.success) document.getElementById('dashMyReg').textContent    = rr.data.length;
}

async function loadMyReg() {
  const res = await API.events('my_registrations');
  const el  = document.getElementById('myRegistrations');
  if (!el) return;
  if (!res.success || res.data.length===0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🎟️</div><div class="empty-title">No registrations yet</div><div class="empty-sub"><button class="btn btn-primary btn-sm" onclick="navigateTo('events')">Browse Events</button></div></div>`;
    return;
  }
  el.innerHTML = `<table class="data-table"><thead><tr><th>Event</th><th>Date</th><th>Tickets</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>`+
    res.data.map(r=>`<tr>
      <td><strong>${r.title}</strong><br><small style="color:var(--text-muted)">${r.category||''}</small></td>
      <td>${r.start_date?new Date(r.start_date+'T00:00:00').toLocaleDateString():'TBD'}</td>
      <td>${r.ticket_count}</td>
      <td>${parseFloat(r.total_price||0)===0?'Free':'$'+parseFloat(r.total_price).toFixed(2)}</td>
      <td><span class="event-card-badge badge-${r.status}" style="position:static">${r.status}</span></td>
      <td><button class="btn btn-secondary btn-sm" onclick="openEventDetail(${r.event_id})">View</button></td>
    </tr>`).join('')+`</tbody></table>`;
}

async function loadMyEv() {
  const res = await API.events('my_events');
  const el  = document.getElementById('myEvents');
  if (!el) return;
  if (!res.success || res.data.length===0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">No events yet</div><div class="empty-sub"><button class="btn btn-primary" onclick="navigateTo('create-event')">Create Event</button></div></div>`;
    return;
  }
  el.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:1rem"><button class="btn btn-primary btn-sm" onclick="navigateTo('create-event')">+ New Event</button></div>
  <table class="data-table"><thead><tr><th>Title</th><th>Date</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead><tbody>`+
    res.data.map(ev=>`<tr>
      <td><strong>${ev.title}</strong></td>
      <td>${ev.start_date?new Date(ev.start_date+'T00:00:00').toLocaleDateString():'TBD'}</td>
      <td><span class="event-card-badge badge-${ev.status}" style="position:static">${ev.status}</span></td>
      <td>${ev.registered_count||0}${ev.capacity>0?'/'+ev.capacity:''}</td>
      <td style="display:flex;gap:.5rem">
        <button class="btn btn-secondary btn-sm" onclick="openEventDetail(${ev.id})">View</button>
        <button class="btn btn-outline btn-sm" onclick="openEditEvent(${ev.id})">Edit</button>
        ${state.user?.role==='admin'?`<button class="btn btn-danger btn-sm" onclick="deleteEvent(${ev.id})">Del</button>`:''}
      </td>
    </tr>`).join('')+`</tbody></table>`;
}

async function loadAdminEvents() {
  const res = await API.events('list', null, { limit: 50 });
  const el  = document.getElementById('adminEvents');
  if (!el||!res.success) return;
  el.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:1rem"><button class="btn btn-primary btn-sm" onclick="navigateTo('create-event')">+ Create Event</button></div>
  <table class="data-table"><thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Status</th><th>Reg</th><th>Actions</th></tr></thead><tbody>`+
    res.data.events.map(ev=>`<tr>
      <td><strong>${ev.title}</strong></td><td>${ev.category||'-'}</td>
      <td>${ev.start_date?new Date(ev.start_date+'T00:00:00').toLocaleDateString():'TBD'}</td>
      <td><span class="event-card-badge badge-${ev.status}" style="position:static">${ev.status}</span></td>
      <td>${ev.registered_count||0}${ev.capacity>0?'/'+ev.capacity:''}</td>
      <td style="display:flex;gap:.5rem">
        <button class="btn btn-outline btn-sm" onclick="openEditEvent(${ev.id})">Edit</button>
        <button class="btn btn-danger btn-sm"  onclick="deleteEvent(${ev.id})">Delete</button>
      </td>
    </tr>`).join('')+`</tbody></table>`;
}

async function deleteEvent(id) {
  if (!confirm('Delete this event permanently?')) return;
  const res = await apiFetch(`./php/events.php?action=delete&id=${id}`);
  if (res.success) { toast('Event deleted', 'success'); initDashboard(); }
  else toast(res.message||'Failed', 'error');
}

// ===================================================
//  Create / Edit Event
// ===================================================
function initCreateEvent() {
  if (!state.user) { showAuth(); return; }
  document.getElementById('eventFormTitle').textContent = 'Create New Event';
  document.getElementById('eventForm').reset();
  document.getElementById('editEventId').value = '';
  document.getElementById('eventSubmitBtn').textContent = 'Create Event';
}

async function openEditEvent(id) {
  const res = await API.events('get', null, { id });
  if (!res.success) { toast('Failed to load event', 'error'); return; }
  const ev = res.data;
  document.getElementById('eventFormTitle').textContent = 'Edit Event';
  document.getElementById('editEventId').value    = ev.id;
  document.getElementById('evTitle').value        = ev.title||'';
  document.getElementById('evDescription').value  = ev.description||'';
  document.getElementById('evCategory').value     = ev.category||'';
  document.getElementById('evLocation').value     = ev.location||'';
  document.getElementById('evVenue').value        = ev.venue||'';
  document.getElementById('evStartDate').value    = ev.start_date||'';
  document.getElementById('evEndDate').value      = ev.end_date||'';
  document.getElementById('evStartTime').value    = ev.start_time||'';
  document.getElementById('evEndTime').value      = ev.end_time||'';
  document.getElementById('evCapacity').value     = ev.capacity||0;
  document.getElementById('evPrice').value        = ev.price||0;
  document.getElementById('evStatus').value       = ev.status||'upcoming';
  document.getElementById('evImage').value        = ev.image||'';
  document.getElementById('eventSubmitBtn').textContent = 'Update Event';
  navigateTo('create-event');
}

async function handleEventSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('eventSubmitBtn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const id = document.getElementById('editEventId').value;
  const data = {
    title:       document.getElementById('evTitle').value,
    description: document.getElementById('evDescription').value,
    category:    document.getElementById('evCategory').value,
    location:    document.getElementById('evLocation').value,
    venue:       document.getElementById('evVenue').value,
    start_date:  document.getElementById('evStartDate').value,
    end_date:    document.getElementById('evEndDate').value,
    start_time:  document.getElementById('evStartTime').value,
    end_time:    document.getElementById('evEndTime').value,
    capacity:    document.getElementById('evCapacity').value,
    price:       document.getElementById('evPrice').value,
    status:      document.getElementById('evStatus').value,
    image:       document.getElementById('evImage').value
  };

  const url = id ? `./php/events.php?action=update&id=${id}` : `./php/events.php?action=create`;
  const res = await apiFetch(url, data);

  btn.disabled = false;
  btn.textContent = id ? 'Update Event' : 'Create Event';

  if (res.success) {
    toast(id ? 'Event updated! ✅' : 'Event created! 🎉', 'success');
    navigateTo('dashboard');
  } else {
    toast(res.message||'Failed to save', 'error');
  }
}

// ===================================================
//  Modal helpers
// ===================================================
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

function showAuth(tab = 'login') {
  openModal('authModal');
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab-content').forEach(el => el.classList.toggle('hidden', el.dataset.tab !== tab));
  document.querySelectorAll('.auth-tab-btn').forEach(b  => b.classList.toggle('active',    b.dataset.tab  === tab));
}

// ===================================================
//  Helpers
// ===================================================
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr>12?hr-12:hr||12}:${m} ${hr>=12?'PM':'AM'}`;
}

// ===================================================
//  Init
// ===================================================
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  navigateTo('home');

  // Close modal on outside click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); });
  });
});

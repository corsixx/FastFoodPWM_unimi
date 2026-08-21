// public/js/stats.js

let currentLang = localStorage.getItem('appLang') || 'IT';
let revenueChartInstance = null;
let categoryChartInstance = null;

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    badgeStats: 'GESTIONALE LOCALE',
    btnRefresh: 'AGGIORNA DATI',
    btnViewMenu: 'VEDI MENU PUBBLICO',
    kpiRevenue: 'Incasso Totale',
    kpiRevenueSub: 'Ordini completati',
    kpiOrders: 'Ordini Ricevuti',
    kpiOrdersSub: 'Storico complessivo',
    kpiMeals: 'Piatti Attivi',
    kpiMealsSub: 'Nel catalogo del locale',
    kpiPending: 'In Preparazione',
    kpiPendingSub: 'Da consegnare al banco',
    chartRevenueTitle: 'ANDAMENTO VENDITE SETTIMANALI (€)',
    chartDays: 'ULTIMI 7 GIORNI',
    chartCatTitle: 'PIATTI PIÙ ORDINATI PER CATEGORIA',
    recentOrdersTitle: 'ULTIMI ORDINI AL BANCONE',
    thOrderId: 'ID Ordine',
    thOrderDate: 'Data & Ora',
    thOrderCustomer: 'Cliente',
    thOrderItems: 'Piatti / Dettaglio',
    thOrderTotal: 'Totale',
    thOrderStatus: 'Stato',
    noOrdersYet: 'Nessun ordine ricevuto al momento.',
    ordersFound: 'ordini trovati',
    dCatalog: 'CATALOGO COMPLETO',
    dRestaurants: 'I NOSTRI RISTORANTI',
    dOrders: 'I MIEI ORDINI',
    dStats: 'STATISTICHE LOCALE',
    login: 'ACCEDI',
    register: 'REGISTRATI',
    logout: 'LOGOUT',
    loggedAs: 'ACCESSO EFFETTUATO COME:',
    fService: 'SERVIZIO',
    fHow: 'Come Ordinare',
    fPickup: 'Ritiro al Bancone',
    fPartner: 'PARTNER',
    fJoin: 'Diventa un Ristorante Partner',
    fManage: 'Accedi al Gestionale',
    fSupport: 'SUPPORTO',
    fContact: 'Contatta Assistenza',
    fChat: 'Chat 24/7 Attiva',
    mInfoTitle: 'Informazioni Servizio',
    mInfoBody: 'Scegli i piatti dal menu, inoltra l\'ordine e ritira direttamente al punto cassa senza code.',
    mLegalTitle: 'Termini & Note Legali',
    mLegalBody: 'Piattaforma protetta con autenticazione JWT. Tutti i dati degli utenti e gli ordini sono gestiti in modo sicuro su database.'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    badgeStats: 'RESTAURANT DASHBOARD',
    btnRefresh: 'REFRESH DATA',
    btnViewMenu: 'VIEW PUBLIC MENU',
    kpiRevenue: 'Total Revenue',
    kpiRevenueSub: 'Completed orders',
    kpiOrders: 'Total Orders',
    kpiOrdersSub: 'Lifetime history',
    kpiMeals: 'Active Dishes',
    kpiMealsSub: 'In restaurant catalog',
    kpiPending: 'In Preparation',
    kpiPendingSub: 'Awaiting counter pickup',
    chartRevenueTitle: 'WEEKLY SALES OVERVIEW (€)',
    chartDays: 'LAST 7 DAYS',
    chartCatTitle: 'MOST ORDERED CATEGORIES',
    recentOrdersTitle: 'RECENT COUNTER ORDERS',
    thOrderId: 'Order ID',
    thOrderDate: 'Date & Time',
    thOrderCustomer: 'Customer',
    thOrderItems: 'Dishes / Details',
    thOrderTotal: 'Total',
    thOrderStatus: 'Status',
    noOrdersYet: 'No orders received yet.',
    ordersFound: 'orders found',
    dCatalog: 'FULL CATALOG',
    dRestaurants: 'OUR RESTAURANTS',
    dOrders: 'MY ORDERS',
    dStats: 'RESTAURANT STATS',
    login: 'LOGIN',
    register: 'REGISTER',
    logout: 'LOGOUT',
    loggedAs: 'LOGGED IN AS:',
    fService: 'SERVICE',
    fHow: 'How to Order',
    fPickup: 'Counter Pickup',
    fPartner: 'PARTNER',
    fJoin: 'Become a Partner Restaurant',
    fManage: 'Access Dashboard',
    fSupport: 'SUPPORT',
    fContact: 'Contact Support',
    fChat: '24/7 Chat Active',
    mInfoTitle: 'Service Information',
    mInfoBody: 'Choose dishes from the menu, place your order and pick up at the checkout counter.',
    mLegalTitle: 'Terms & Legal Notes',
    mLegalBody: 'Secure platform protected by JWT authentication. User data and orders are stored securely in database.'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  // Protezione rotta: solo i ristoratori possono accedere
  if (!token || role !== 'restaurant') {
    window.location.href = 'login.html';
    return;
  }

  renderLanguageUI();
  renderHeaderInfo();
  loadRestaurantStats();
  renderDrawerAuth();
});

function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
  loadRestaurantStats();
}

function renderLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('lang-btn', t.btn);
  setT('txt-announcement', t.announcement);
  setT('txt-badge-stats', t.badgeStats);
  setT('txt-btn-refresh', t.btnRefresh);
  setT('txt-btn-viewmenu', t.btnViewMenu);
  setT('txt-kpi-revenue', t.kpiRevenue);
  setT('txt-kpi-revenue-sub', t.kpiRevenueSub);
  setT('txt-kpi-orders', t.kpiOrders);
  setT('txt-kpi-orders-sub', t.kpiOrdersSub);
  setT('txt-kpi-meals', t.kpiMeals);
  setT('txt-kpi-meals-sub', t.kpiMealsSub);
  setT('txt-kpi-pending', t.kpiPending);
  setT('txt-kpi-pending-sub', t.kpiPendingSub);
  setT('txt-chart-revenue-title', t.chartRevenueTitle);
  setT('txt-chart-days', t.chartDays);
  setT('txt-chart-cat-title', t.chartCatTitle);
  setT('txt-recent-orders-title', t.recentOrdersTitle);
  setT('th-order-id', t.thOrderId);
  setT('th-order-date', t.thOrderDate);
  setT('th-order-customer', t.thOrderCustomer);
  setT('th-order-items', t.thOrderItems);
  setT('th-order-total', t.thOrderTotal);
  setT('th-order-status', t.thOrderStatus);

  setT('txt-f-service', t.fService);
  setT('txt-f-how', t.fHow);
  setT('txt-f-pickup', t.fPickup);
  setT('txt-f-partner', t.fPartner);
  setT('txt-f-join', t.fJoin);
  setT('txt-f-manage', t.fManage);
  setT('txt-f-support', t.fSupport);
  setT('txt-f-contact', t.fContact);
  setT('txt-f-chat', t.fChat);
  setT('txt-m-info-title', t.mInfoTitle);
  setT('txt-m-info-body', t.mInfoBody);
  setT('txt-m-legal-title', t.mLegalTitle);
  setT('txt-m-legal-body', t.mLegalBody);

  setT('txt-d-catalog', t.dCatalog);
  setT('txt-d-restaurants', t.dRestaurants);
  setT('txt-d-orders', t.dOrders);
  setT('txt-d-stats', t.dStats);
}

function renderHeaderInfo() {
  const restName = localStorage.getItem('restaurantName') || localStorage.getItem('userName') || 'Il Mio Locale';
  const restAddr = localStorage.getItem('restaurantAddress') || 'Ritiro ordini al bancone';

  const nameEl = document.getElementById('restaurant-name-header');
  const addrEl = document.getElementById('restaurant-addr-header');

  if (nameEl) nameEl.textContent = restName;
  if (addrEl) addrEl.textContent = restAddr;
}

/**
 * Caricamento Statistiche dal Backend
 */
async function loadRestaurantStats() {
  const t = i18n[currentLang];
  let statsData = null;

  try {
    statsData = await apiRequest('/restaurant/stats');
  } catch (err) {
    // Fallback con dati vuoti a 0 se non ci sono ordini
    statsData = {
      totalRevenue: 0,
      totalOrders: 0,
      activeMealsCount: 0,
      pendingOrdersCount: 0,
      weeklyRevenue: [0, 0, 0, 0, 0, 0, 0],
      weeklyLabels: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
      categoriesData: { labels: ['Nessun dato'], counts: [0] },
      recentOrders: []
    };
  }

  // 1. Aggiorna Schede KPI
  document.getElementById('kpi-revenue-val').textContent = `€ ${(statsData.totalRevenue || 0).toFixed(2)}`;
  document.getElementById('kpi-orders-val').textContent = statsData.totalOrders || 0;
  document.getElementById('kpi-meals-val').textContent = statsData.activeMealsCount || 0;
  document.getElementById('kpi-pending-val').textContent = statsData.pendingOrdersCount || 0;

  // 2. Renderizza Grafici
  renderRevenueChart(statsData.weeklyLabels || ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'], statsData.weeklyRevenue || [0, 0, 0, 0, 0, 0, 0]);
  renderCategoryChart(statsData.categoriesData || { labels: ['Nessuna Vendita'], counts: [1] });

  // 3. Renderizza Tabella Ordini
  renderRecentOrdersTable(statsData.recentOrders || []);
}

/**
 * Grafico Andamento Incassi (Line Chart minimale nero/grigio)
 */
function renderRevenueChart(labels, dataValues) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Incasso (€)',
        data: dataValues,
        borderColor: '#111111',
        backgroundColor: 'rgba(17, 17, 17, 0.05)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#111111',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `€ ${context.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `€ ${value}`
          },
          grid: { color: '#f0f0f0' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Grafico Distribuzione Categorie (Doughnut Chart)
 */
function renderCategoryChart(catData) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const hasData = catData.counts && catData.counts.some(c => c > 0);
  const labels = hasData ? catData.labels : ['Nessun Ordine'];
  const counts = hasData ? catData.counts : [1];
  const bgColors = hasData 
    ? ['#111111', '#555555', '#888888', '#bbbbbb', '#e0e0e0']
    : ['#e0e0e0'];

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: bgColors,
        borderWidth: 1,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } }
        }
      },
      cutout: '70%'
    }
  });
}

/**
 * Tabella Ordini Recenti
 */
function renderRecentOrdersTable(orders) {
  const tbody = document.getElementById('stats-orders-tbody');
  const countBadge = document.getElementById('orders-count-badge');
  const t = i18n[currentLang];

  if (!tbody) return;

  if (countBadge) countBadge.textContent = `${orders.length} ${t.ordersFound}`;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">${t.noOrdersYet}</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(ord => {
    const idShort = (ord._id || 'ORD').slice(-6).toUpperCase();
    const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '--/--';
    const custName = ord.customerName || (ord.user && ord.user.name) || 'Cliente Bancone';
    const itemsSummary = Array.isArray(ord.items) 
      ? ord.items.map(i => `${i.quantity}x ${i.name || 'Piatto'}`).join(', ')
      : '1x Menu';
    const total = (ord.totalAmount || ord.total || 0).toFixed(2);
    
    let statusBadge = '<span class="badge bg-secondary rounded-0">RICEVUTO</span>';
    if (ord.status === 'in_preparation') statusBadge = '<span class="badge bg-warning text-dark rounded-0">IN PREPARAZIONE</span>';
    if (ord.status === 'ready') statusBadge = '<span class="badge bg-info text-dark rounded-0">PRONTO AL RITIRO</span>';
    if (ord.status === 'completed') statusBadge = '<span class="badge bg-success rounded-0">COMPLETATO</span>';

    return `
      <tr>
        <td class="font-monospace fw-bold">#${idShort}</td>
        <td class="text-muted">${dateStr}</td>
        <td class="fw-bold">${custName}</td>
        <td class="text-truncate" style="max-width: 200px;" title="${itemsSummary}">${itemsSummary}</td>
        <td class="fw-bold font-monospace">€ ${total}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Utente';
  const drawerSec = document.getElementById('drawer-user-section');

  if (!drawerSec) return;

  const isIt = currentLang === 'IT';

  if (token) {
    drawerSec.innerHTML = `
      <div class="small text-muted mb-1 text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.05em;">
        ${isIt ? 'Accesso effettuato come:' : 'Logged in as:'}
      </div>
      <div class="fw-bold text-uppercase mb-3" style="font-family: 'Space Grotesk', sans-serif;">
        ${name} <span class="badge bg-black rounded-0 ms-1" style="font-size: 0.65rem;">${role}</span>
      </div>

      <a href="profile.html" class="btn btn-dark rounded-0 w-100 py-2 mb-2 fw-bold text-uppercase d-flex justify-content-between align-items-center" style="font-size: 0.8rem; letter-spacing: 0.05em;">
        <span>${isIt ? 'Vedi il mio profilo' : 'View my profile'}</span>
        <i class="bi bi-arrow-right"></i>
      </a>

      <button class="btn btn-outline-dark rounded-0 w-100 btn-sm py-2 fw-bold text-uppercase" style="font-size: 0.75rem;" onclick="logout()">
        ${isIt ? 'Logout' : 'Logout'}
      </button>
    `;
  } else {
    drawerSec.innerHTML = `
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${isIt ? 'Accedi' : 'Login'}</a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${isIt ? 'Registrati' : 'Register'}</a>
    `;
  }
}
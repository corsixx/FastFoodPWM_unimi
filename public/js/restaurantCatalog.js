// public/js/restaurantCatalog.js

const ITEMS_PER_PAGE = 8;
let currentPage = 1;

let currentSearch = '';
let rawRestaurantsList = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentLang = localStorage.getItem('appLang') || 'IT';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    restTitle: 'I NOSTRI RISTORANTI PARTNER',
    searchPlaceholder: 'Cerca ristorante, cucina o indirizzo...',
    foundItems: 'locali registrati',
    noItems: 'NESSUN RISTORANTE TROVATO CON I FILTRI SELEZIONATI.',
    loading: 'CARICAMENTO LOCALI DA MONGODB...',
    pageLabel: 'PAG.',
    viewMenuBtn: 'VEDI MENU',
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
    mInfoTitle: 'Informazioni Servizio',
    mInfoBody: 'Scegli il tuo ristorante partner preferito ed esplora il suo menu esclusivo con ritiro senza code.',
    mLegalTitle: 'Termini & Note Legali',
    mLegalBody: 'Piattaforma protetta con autenticazione JWT e gestione ordini in tempo reale su database.'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    restTitle: 'OUR PARTNER RESTAURANTS',
    searchPlaceholder: 'Search restaurant, cuisine or address...',
    foundItems: 'registered restaurants',
    noItems: 'NO RESTAURANTS FOUND MATCHING YOUR SEARCH.',
    loading: 'LOADING RESTAURANTS FROM MONGODB...',
    pageLabel: 'PAGE',
    viewMenuBtn: 'VIEW MENU',
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
    mInfoTitle: 'Service Information',
    mInfoBody: 'Choose your favorite partner restaurant and explore their exclusive menu for express pickup.',
    mLegalTitle: 'Terms & Legal Notes',
    mLegalBody: 'Secure platform protected by JWT authentication and real-time database orders.'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderLanguageUI();
  renderCartBadge();
  if (typeof renderDrawerCartUI === 'function') renderDrawerCartUI();
  loadRestaurants();
  renderDrawerAuth();
});

/**
 * 1. GESTIONE LINGUA
 */
function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
  updateView();
}

function renderLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('lang-btn', t.btn);
  setT('txt-announcement', t.announcement);
  setT('txt-rest-title', t.restTitle);

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  setT('txt-f-service', t.fService);
  setT('txt-f-how', t.fHow);
  setT('txt-f-pickup', t.fPickup);
  setT('txt-f-partner', t.fPartner);
  setT('txt-f-join', t.fJoin);
  setT('txt-f-manage', t.fManage);
  setT('txt-f-support', t.fSupport);
  setT('txt-f-contact', t.fContact);
  setT('txt-m-info-title', t.mInfoTitle);
  setT('txt-m-info-body', t.mInfoBody);
  setT('txt-m-legal-title', t.mLegalTitle);
  setT('txt-m-legal-body', t.mLegalBody);

  setT('txt-d-catalog', t.dCatalog);
  setT('txt-d-restaurants', t.dRestaurants);
  setT('txt-d-orders', t.dOrders);
  setT('txt-d-stats', t.dStats);
}

/**
 * 2. CARICA I RISTORANTI DAL BACKEND
 */
async function loadRestaurants() {
  const grid = document.getElementById('restaurants-grid');
  if (!grid) return;

  const t = i18n[currentLang];
  grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small"><div class="spinner-border spinner-border-sm me-2"></div>${t.loading}</div>`;

  try {
    const data = await apiRequest('/auth/restaurants');

    if (data && Array.isArray(data)) {
      rawRestaurantsList = data.map(r => ({
        _id: r._id,
        // Dà priorità assoluta al nome del locale
        restaurantName: r.restaurantName || r.name || 'Ristorante Partner',
        cuisine: r.cuisineType || r.cuisine || 'PARTNER RESTAURANT',
        location: r.restaurantAddress || r.location || r.address || 'Ritiro al Bancone',
        phone: r.restaurantPhone || r.phone || '',
        img: r.img || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'
      }));
    } else {
      rawRestaurantsList = [];
    }

    currentPage = 1;
    updateView();
  } catch (err) {
    console.error('Errore chiamata ristoranti:', err);
    grid.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore caricamento dati dal database.</div>`;
  }
}

/**
 * 3. FILTRA RICERCA
 */
function getFilteredRestaurants() {
  let list = [...rawRestaurantsList];

  if (currentSearch) {
    const term = currentSearch.toLowerCase();
    list = list.filter(r =>
      (r.restaurantName && r.restaurantName.toLowerCase().includes(term)) ||
      (r.location && r.location.toLowerCase().includes(term)) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(term))
    );
  }

  return list;
}

/**
 * 4. AGGIORNA VISTA E PAGINAZIONE
 */
function updateView() {
  const filtered = getFilteredRestaurants();
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const countLabel = document.getElementById('results-count');
  const t = i18n[currentLang];
  if (countLabel) {
    countLabel.textContent = `${totalItems} ${t.foundItems}`;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  renderRestaurantsGrid(pageItems);
  renderMinimalPagination(totalPages);
}

/**
 * 5. RENDERING DELLE CARD RISTORANTE
 */
function renderRestaurantsGrid(restaurants) {
  const grid = document.getElementById('restaurants-grid');
  if (!grid) return;

  const t = i18n[currentLang];

  if (restaurants.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${t.noItems}</div>`;
    return;
  }

  grid.innerHTML = restaurants.map(r => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="product-card cursor-pointer" onclick="goToRestaurantMenu('${r._id}')">
        <div class="product-img-wrapper">
          <img src="${r.img}" alt="${r.restaurantName}" loading="lazy">
          <span class="product-tag">${r.cuisine.toUpperCase()}</span>
        </div>
        <div class="product-info-body">
          <div class="product-title">${r.restaurantName}</div>
          <div class="product-price">
            ${r.location} &bull; <span class="small fw-bold text-dark text-decoration-underline">${t.viewMenuBtn} &rarr;</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function goToRestaurantMenu(restaurantId) {
  window.location.href = `restaurantDetail.html?id=${encodeURIComponent(restaurantId)}`;
}

/**
 * 6. CONTROLLO PAGINAZIONE A FRECCETTE MINIMALE
 */
function renderMinimalPagination(totalPages) {
  const container = document.getElementById('pagination-controls');
  const wrapper = document.getElementById('pagination-wrapper');
  if (!container || !wrapper) return;

  if (totalPages <= 1) {
    wrapper.classList.add('d-none');
    return;
  }

  wrapper.classList.remove('d-none');
  const t = i18n[currentLang];

  const currentFormatted = String(currentPage).padStart(2, '0');
  const totalFormatted = String(totalPages).padStart(2, '0');

  container.innerHTML = `
    <button class="page-arrow-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i>
    </button>
    <div class="page-counter-text">${t.pageLabel} ${currentFormatted} / ${totalFormatted}</div>
    <button class="page-arrow-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
      <i class="bi bi-chevron-right"></i>
    </button>
  `;
}

function goToPage(page) {
  currentPage = page;
  updateView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSearch(val) {
  currentSearch = val.trim();
  currentPage = 1;
  updateView();
}

function renderCartBadge() {
  cart = JSON.parse(localStorage.getItem('cart')) || [];
  const count = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;
}

/**
 * 7. GESTIONE AUTENTICAZIONE NEL DRAWER
 */
function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Utente';
  const drawerSec = document.getElementById('drawer-user-section');

  if (!drawerSec) return;

  const currentLang = localStorage.getItem('appLang') || 'IT';
  const isIt = currentLang === 'IT';

  const statsLink = document.getElementById('drawer-stats-link');
  if (statsLink && role === 'restaurant') {
    statsLink.classList.remove('d-none');
  }

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
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.05em;">
        ${isIt ? 'Accedi' : 'Login'}
      </a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.05em;">
        ${isIt ? 'Registrati' : 'Register'}
      </a>
    `;
  }
}
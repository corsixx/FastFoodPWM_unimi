// public/js/restaurants.js

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
    searchPlaceholder: 'Cerca ristorante o tipologia...',
    foundItems: 'locali trovati',
    noItems: 'NESSUN RISTORANTE TROVATO CON I FILTRI SELEZIONATI.',
    loading: 'CARICAMENTO LOCALI IN CORSO...',
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
    fWait: 'Tempi di Attesa',
    fPartner: 'PARTNER',
    fJoin: 'Diventa un Ristorante Partner',
    fManage: 'Accedi al Gestionale',
    fSupport: 'SUPPORTO',
    fContact: 'Contatta Assistenza',
    fChat: 'Chat 24/7 Attiva',
    mInfoTitle: 'Informazioni Servizio',
    mInfoBody: 'Scegli il tuo ristorante preferito per visualizzare solo il suo catalogo piatti ed ordinare senza attese.',
    mLegalTitle: 'Termini & Note Legali',
    mLegalBody: 'Piattaforma protetta con autenticazione JWT. Tutti i dati degli utenti e gli ordini sono gestiti in modo sicuro su database.'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    restTitle: 'OUR PARTNER RESTAURANTS',
    searchPlaceholder: 'Search restaurant or cuisine...',
    foundItems: 'restaurants found',
    noItems: 'NO RESTAURANTS FOUND MATCHING YOUR SEARCH.',
    loading: 'LOADING RESTAURANTS...',
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
    fWait: 'Wait Times',
    fPartner: 'PARTNER',
    fJoin: 'Become a Partner Restaurant',
    fManage: 'Access Dashboard',
    fSupport: 'SUPPORT',
    fContact: 'Contact Support',
    fChat: '24/7 Chat Active',
    mInfoTitle: 'Service Information',
    mInfoBody: 'Choose your favorite restaurant to explore their dedicated menu and order without waiting in line.',
    mLegalTitle: 'Terms & Legal Notes',
    mLegalBody: 'Secure platform protected by JWT authentication. User data and orders are stored securely in database.'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderLanguageUI();
  renderCartBadge();
  loadRestaurants();
  renderDrawerAuth();
});

/**
 * 1. CAMBIO LINGUA
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
  setT('txt-f-wait', t.fWait);
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

/**
 * 2. CARICA I RISTORANTI DAL BACKEND (FALLBACK SU LISTA DEFAULT SE NON ANCORA CENSITI)
 */
async function loadRestaurants() {
  const grid = document.getElementById('restaurants-grid');
  if (!grid) return;

  const t = i18n[currentLang];
  grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${t.loading}</div>`;

  try {
    const data = await apiRequest('/restaurants');
    if (data && Array.isArray(data) && data.length > 0) {
      rawRestaurantsList = data;
    } else {
      // Fallback ristoranti demo nel mood del locale se non hai ancora un endpoint dedicato
      rawRestaurantsList = [
        { _id: '1', name: 'Smash Lab Tokyo', cuisine: 'BURGER & FRIES', location: 'Milano Centro', img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80' },
        { _id: '2', name: 'Napoletana 5.0', cuisine: 'PIZZA CONTEMPORANEA', location: 'Navigli', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80' },
        { _id: '3', name: 'Ramen Katsu Bar', cuisine: 'JAPANESE STREET FOOD', location: 'Porta Romana', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80' },
        { _id: '4', name: 'Green Poke Studio', cuisine: 'HEALTHY BOWLS', location: 'Isola', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80' },
        { _id: '5', name: 'Tacos & Birria Urban', cuisine: 'MEXICAN FOOD', location: 'Città Studi', img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80' },
        { _id: '6', name: 'Crunchy Fried Box', cuisine: 'SOUTHERN FRIED CHICKEN', location: 'Lambrate', img: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80' }
      ];
    }
    currentPage = 1;
    updateView();
  } catch (err) {
    grid.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore durante il caricamento dei ristoranti.</div>`;
  }
}

/**
 * 3. FILTRA I RISTORANTI
 */
function getFilteredRestaurants() {
  let list = [...rawRestaurantsList];

  if (currentSearch) {
    const term = currentSearch.toLowerCase();
    list = list.filter(r => 
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(term)) ||
      (r.location && r.location.toLowerCase().includes(term))
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
      <div class="product-card" onclick="goToRestaurantMenu('${r._id}')">
        <div class="product-img-wrapper">
          <img src="${r.img || 'https://via.placeholder.com/400x500?text=Restaurant'}" alt="${r.name}" loading="lazy">
          <span class="product-tag">${r.cuisine || 'RESTAURANT'}</span>
        </div>
        <div class="product-title">${r.name}</div>
        <div class="product-price">${r.location || 'Official Store'} &bull; <span class="small fw-bold text-dark text-decoration-underline">${t.viewMenuBtn} &rarr;</span></div>
      </div>
    </div>
  `).join('');
}

function goToRestaurantMenu(restaurantId) {
  window.location.href = `catalog.html?restaurant=${encodeURIComponent(restaurantId)}`;
}

/**
 * 6. RENDERING PAGINAZIONE MINIMALE (FRECCETTE)
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
  const count = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;
}

/**
 * 7. STATO UTENTE NEL DRAWER
 */
function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName');
  const drawerSec = document.getElementById('drawer-user-section');

  if (!drawerSec) return;

  const t = i18n[currentLang];

  if (role === 'restaurant') {
    const statsLink = document.getElementById('drawer-stats-link');
    if (statsLink) statsLink.classList.remove('d-none');
  }

  if (token) {
    drawerSec.innerHTML = `
      <div class="small text-muted mb-1">${t.loggedAs}</div>
      <div class="fw-bold text-uppercase mb-3">${name || 'Utente'} (${role})</div>
      <button class="btn btn-outline-dark rounded-0 w-100 btn-sm" onclick="logout()">${t.logout}</button>
    `;
  } else {
    drawerSec.innerHTML = `
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${t.login}</a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${t.register}</a>
    `;
  }
}
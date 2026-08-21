// public/js/catalog.js

const ITEMS_PER_PAGE = 8;
let currentPage = 1;

let currentCategory = '';
let currentSearch = '';
let currentSort = 'default';
let rawMealsList = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentLang = localStorage.getItem('appLang') || 'IT';
let mealModalInstance = null;

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    catalogTitle: 'MENU COMPLETO',
    searchPlaceholder: 'Cerca piatto o ingrediente...',
    sortDefault: 'Ordina: Predefinito',
    sortPriceAsc: 'Prezzo: Crescente',
    sortPriceDesc: 'Prezzo: Decrescente',
    sortTime: 'Tempo preparazione',
    sortName: 'Nome (A - Z)',
    allCat: 'ALL / TUTTO',
    prep: 'prep',
    foundItems: 'piatti trovati',
    noItems: 'NESSUN PIATTO TROVATO CON I FILTRI SELEZIONATI.',
    loading: 'CARICAMENTO CATALOGO IN CORSO...',
    pageLabel: 'PAG.',
    btnView: 'VEDI',
    btnCart: '+ CARRELLO',
    modalDesc: 'Descrizione & Ingredienti',
    modalAdd: 'AGGIUNGI AL CARRELLO',
    prepTimeLabel: 'Tempo di preparazione:',
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
    mInfoBody: 'Scegli i piatti dal menu, inoltra l\'ordine e ritira direttamente al punto cassa senza code.',
    mLegalTitle: 'Termini & Note Legali',
    mLegalBody: 'Piattaforma protetta con autenticazione JWT. Tutti i dati degli utenti e gli ordini sono gestiti in modo sicuro su database.'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    catalogTitle: 'FULL MENU CATALOG',
    searchPlaceholder: 'Search dish or ingredient...',
    sortDefault: 'Sort: Default',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    sortTime: 'Preparation time',
    sortName: 'Name (A - Z)',
    allCat: 'ALL',
    prep: 'prep',
    foundItems: 'dishes found',
    noItems: 'NO DISHES FOUND MATCHING YOUR FILTERS.',
    loading: 'LOADING CATALOG ITEMS...',
    pageLabel: 'PAGE',
    btnView: 'VIEW',
    btnCart: '+ ADD',
    modalDesc: 'Description & Ingredients',
    modalAdd: 'ADD TO CART',
    prepTimeLabel: 'Preparation time:',
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
    mInfoBody: 'Choose dishes from the menu, place your order and pick up at the checkout counter.',
    mLegalTitle: 'Terms & Legal Notes',
    mLegalBody: 'Secure platform protected by JWT authentication. User data and orders are stored securely in database.'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('modalMealDetail');
  if (modalEl) {
    mealModalInstance = new bootstrap.Modal(modalEl);
  }

  renderLanguageUI();
  renderCartBadge();
  loadBackendCategories();
  loadFullCatalog();
  renderDrawerAuth();
  setupBarMovement();
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
  loadBackendCategories();
}

function renderLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('lang-btn', t.btn);
  setT('txt-announcement', t.announcement);
  setT('txt-catalog-title', t.catalogTitle);
  setT('btn-cat-all', t.allCat);

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  setT('opt-sort-default', t.sortDefault);
  setT('opt-sort-price-asc', t.sortPriceAsc);
  setT('opt-sort-price-desc', t.sortPriceDesc);
  setT('opt-sort-time', t.sortTime);
  setT('opt-sort-name', t.sortName);

  setT('txt-modal-desc', t.modalDesc);
  setT('txt-modal-add', t.modalAdd);

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
 * 2. CARICA CATEGORIE
 */
async function loadBackendCategories() {
  const navContainer = document.getElementById('categories-nav');
  if (!navContainer) return;

  try {
    const categories = await apiRequest('/meals/categories');
    const allLabel = i18n[currentLang].allCat;

    if (categories && Array.isArray(categories) && categories.length > 0) {
      const buttons = categories.map(cat => `
        <button class="nav-category-link ${currentCategory === cat ? 'active' : ''}" 
                onclick="filterCategory('${cat.replace(/'/g, "\\'")}', this)">
          ${cat.toUpperCase()}
        </button>
      `).join('');

      navContainer.innerHTML = `
        <button class="nav-category-link ${currentCategory === '' ? 'active' : ''}" 
                onclick="filterCategory('', this)" id="btn-cat-all">${allLabel}</button>
        ${buttons}
      `;
    }
  } catch (err) {
    console.error("Errore categorie:", err);
  }
}

/**
 * 3. CARICA TUTTI I PIATTI DAL DATABASE
 */
async function loadFullCatalog() {
  const grid = document.getElementById('meals-grid');
  if (!grid) return;

  const t = i18n[currentLang];
  grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${t.loading}</div>`;

  try {
    const meals = await apiRequest('/meals');
    rawMealsList = meals || [];
    currentPage = 1;
    updateView();
  } catch (err) {
    grid.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore caricamento piatti.</div>`;
  }
}

/**
 * 4. FILTRI E ORDINAMENTO
 */
function getFilteredAndSortedMeals() {
  let list = [...rawMealsList];

  if (currentCategory) {
    list = list.filter(m => m.strCategory && m.strCategory.toLowerCase() === currentCategory.toLowerCase());
  }

  if (currentSearch) {
    const term = currentSearch.toLowerCase();
    list = list.filter(m => 
      (m.strMeal && m.strMeal.toLowerCase().includes(term)) ||
      (m.strInstructions && m.strInstructions.toLowerCase().includes(term))
    );
  }

  if (currentSort === 'price-asc') {
    list.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (currentSort === 'price-desc') {
    list.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (currentSort === 'time-asc') {
    list.sort((a, b) => (a.preparationTime || 0) - (b.preparationTime || 0));
  } else if (currentSort === 'name-asc') {
    list.sort((a, b) => (a.strMeal || '').localeCompare(b.strMeal || ''));
  }

  return list;
}

/**
 * 5. AGGIORNA VISTA E PAGINAZIONE
 */
function updateView() {
  const allFiltered = getFilteredAndSortedMeals();
  const totalItems = allFiltered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const countLabel = document.getElementById('results-count');
  const t = i18n[currentLang];
  if (countLabel) {
    countLabel.textContent = `${totalItems} ${t.foundItems}`;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageMeals = allFiltered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  renderMealsGrid(pageMeals);
  renderMinimalPagination(totalPages);
}

/**
 * 6. RENDERING DELLE CARD (CON TASTO VIEW E TASTO CARRELLO SEPARATI)
 */
function renderMealsGrid(meals) {
  const grid = document.getElementById('meals-grid');
  if (!grid) return;

  const t = i18n[currentLang];

  if (meals.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${t.noItems}</div>`;
    return;
  }

  grid.innerHTML = meals.map(m => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="product-card">
        
        <!-- Immagine cliccabile per aprire i dettagli -->
        <div class="product-img-wrapper" onclick="openMealDetails('${m._id}')">
          <img src="${m.strMealThumb || 'https://via.placeholder.com/400x300?text=FastFood'}" alt="${m.strMeal || ''}" loading="lazy">
          <span class="product-tag">${m.strCategory || 'MENU'}</span>
        </div>

        <div class="product-info-body">
          <div class="product-title">${m.strMeal || 'Piatto'}</div>
          <div class="product-price">€ ${(m.price || 0).toFixed(2)} <span class="small text-muted fw-normal">&bull; ${m.preparationTime || 10}m ${t.prep}</span></div>
        </div>

        <!-- ACTION GROUP: TASTO VEDI E TASTO CARRELLO -->
        <div class="card-action-group">
          <button class="btn-card-action btn-card-view" onclick="openMealDetails('${m._id}')">
            <i class="bi bi-eye"></i> ${t.btnView}
          </button>
          <button class="btn-card-action btn-card-cart" onclick="addToCart('${m._id}', '${(m.strMeal || 'Piatto').replace(/'/g, "\\'")}', ${m.price || 0})">
            <i class="bi bi-bag-plus"></i> ${t.btnCart}
          </button>
        </div>

      </div>
    </div>
  `).join('');
}

/**
 * 7. APRE LA MODALE DI DETTAGLIO PIATTO (VIEW)
 */
function openMealDetails(mealId) {
  const meal = rawMealsList.find(m => m._id === mealId);
  if (!meal) return;

  const t = i18n[currentLang];

  document.getElementById('modal-meal-name').textContent = meal.strMeal || 'DETTAGLIO PIATTO';
  document.getElementById('modal-meal-title').textContent = meal.strMeal || 'Piatto';
  document.getElementById('modal-meal-category').textContent = meal.strCategory || 'MENU';
  document.getElementById('modal-meal-price').textContent = `€ ${(meal.price || 0).toFixed(2)}`;
  document.getElementById('modal-meal-img').src = meal.strMealThumb || 'https://via.placeholder.com/400x300?text=FastFood';
  
  document.getElementById('modal-meal-time').innerHTML = `
    <i class="bi bi-clock me-1"></i> ${t.prepTimeLabel} <strong>${meal.preparationTime || 10} min</strong>
  `;

  document.getElementById('modal-meal-desc').textContent = meal.strInstructions || 'Nessuna descrizione o ingrediente disponibile.';

  const btnAdd = document.getElementById('modal-btn-add-cart');
  btnAdd.onclick = () => {
    addToCart(meal._id, meal.strMeal || 'Piatto', meal.price || 0);
    if (mealModalInstance) mealModalInstance.hide();
  };

  if (mealModalInstance) {
    mealModalInstance.show();
  }
}

/**
 * 8. RENDERING CONTROLLER PAGINAZIONE MINIMALE (FRECCETTE)
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

/**
 * 9. HANDLERS EVENTI
 */
function filterCategory(categoryName, btnElement) {
  currentCategory = categoryName;
  currentPage = 1;
  document.querySelectorAll('.nav-category-link').forEach(el => el.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  updateView();
}

function handleSearch(val) {
  currentSearch = val.trim();
  currentPage = 1;
  updateView();
}

function handleSort(val) {
  currentSort = val;
  updateView();
}

/**
 * 10. CARRELLO
 */
function addToCart(mealId, name, price) {
  const item = cart.find(i => i.mealId === mealId);
  if (item) item.quantity += 1;
  else cart.push({ mealId, name, price, quantity: 1 });

  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartBadge();

  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.classList.add('bg-warning', 'text-dark');
    setTimeout(() => badge.classList.remove('bg-warning', 'text-dark'), 300);
  }
}

function renderCartBadge() {
  const count = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;
}

/**
 * 11. SCORRIMENTO BARRA CATEGORIE
 */
function setupBarMovement() {
  const slider = document.querySelector('.categories-bar-wrapper');
  if (!slider) return;

  slider.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      slider.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  slider.addEventListener('mouseleave', () => { isDown = false; });
  slider.addEventListener('mouseup', () => { isDown = false; });

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.5;
    slider.scrollLeft = scrollLeft - walk;
  });
}

/**
 * 12. STATO DRAWER UTENTE
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
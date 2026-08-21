// public/js/restaurantDetail.js

let currentLang = localStorage.getItem('appLang') || 'IT';
let currentRestaurant = null;
let allRestaurantMeals = [];
let activeCategoryFilter = '';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    badgePartner: 'RISTORANTE PARTNER',
    badgeMenu: 'MENU DEL LOCALE',
    menuTitle: 'PIATTI PREPARATI DA QUESTO RISTORANTE',
    pickupMode: 'MODALITÀ DI RITIRO',
    pickupDesc: 'RITIRO AL BANCONE DIRETTO',
    btnCatAll: 'TUTTO IL MENU',
    dishesCount: 'piatti disponibili',
    noDishes: 'Nessun piatto disponibile per questo ristorante.',
    addCart: '+ CARRELLO',
    viewDetails: 'DETTAGLI',
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
    fChat: 'Chat 24/7 Attiva'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    badgePartner: 'PARTNER RESTAURANT',
    badgeMenu: 'RESTAURANT MENU',
    menuTitle: 'DISHES CRAFTED BY THIS RESTAURANT',
    pickupMode: 'PICKUP MODE',
    pickupDesc: 'DIRECT COUNTER TAKEOUT',
    btnCatAll: 'FULL MENU',
    dishesCount: 'dishes available',
    noDishes: 'No dishes available for this restaurant.',
    addCart: '+ CART',
    viewDetails: 'DETAILS',
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
    fChat: '24/7 Chat Active'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderLanguageUI();
  loadRestaurantData();
  renderDrawerAuth();
  if (typeof renderDrawerCartUI === 'function') renderDrawerCartUI();
});

function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
  renderMealsGrid();
}

function renderLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('lang-btn', t.btn);
  setT('txt-announcement', t.announcement);
  setT('txt-badge-partner', t.badgePartner);
  setT('txt-badge-menu', t.badgeMenu);
  setT('txt-menu-title', t.menuTitle);
  setT('txt-pickup-mode', t.pickupMode);
  setT('txt-pickup-desc', t.pickupDesc);
  setT('btn-cat-all', t.btnCatAll);

  setT('txt-f-service', t.fService);
  setT('txt-f-how', t.fHow);
  setT('txt-f-pickup', t.fPickup);
  setT('txt-f-partner', t.fPartner);
  setT('txt-f-join', t.fJoin);
  setT('txt-f-manage', t.fManage);
  setT('txt-f-support', t.fSupport);
  setT('txt-f-contact', t.fContact);
  setT('txt-f-chat', t.fChat);

  setT('txt-d-catalog', t.dCatalog);
  setT('txt-d-restaurants', t.dRestaurants);
  setT('txt-d-orders', t.dOrders);
  setT('txt-d-stats', t.dStats);
}

/**
 * Recupera l'ID del ristorante dalla query string (?id=...) e carica anagrafica + piatti
 */
async function loadRestaurantData() {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('id');

  const nameEl = document.getElementById('rest-name-display');
  const addrEl = document.getElementById('rest-addr-display');
  const phoneEl = document.getElementById('rest-phone-display');
  const pivaEl = document.getElementById('rest-piva-display');
  const gridEl = document.getElementById('restaurant-meals-grid');

  if (!restaurantId) {
    if (nameEl) nameEl.textContent = 'Ristorante non specificato';
    if (gridEl) gridEl.innerHTML = `<div class="col-12 text-center py-5 text-muted">ID ristorante mancante nell'URL. <a href="restaurantCatalog.html" class="fw-bold text-dark">Torna all'elenco ristoranti</a></div>`;
    return;
  }

  try {
    // 1. Carica dettagli del ristorante
    const restRes = await apiRequest(`/restaurants/${encodeURIComponent(restaurantId)}`);
    currentRestaurant = restRes.restaurant || restRes;

    if (nameEl) nameEl.textContent = currentRestaurant.restaurantName || currentRestaurant.name || 'Ristorante Partner';
    if (addrEl) addrEl.innerHTML = `<i class="bi bi-geo-alt text-dark me-1"></i> ${currentRestaurant.restaurantAddress || currentRestaurant.address || 'Ritiro al bancone'}`;
    if (phoneEl) phoneEl.innerHTML = `<i class="bi bi-telephone text-dark me-1"></i> ${currentRestaurant.restaurantPhone || currentRestaurant.phone || '--'}`;
    if (pivaEl) pivaEl.innerHTML = `<i class="bi bi-building text-dark me-1"></i> P.IVA: ${currentRestaurant.partitaIva || currentRestaurant.vatNumber || 'IT00000000000'}`;

    // 2. Carica i piatti appartenenti a questo ristorante
    const mealsRes = await apiRequest(`/meals?restaurantId=${encodeURIComponent(restaurantId)}`);
    allRestaurantMeals = Array.isArray(mealsRes) ? mealsRes : (mealsRes.meals || []);

    renderCategoryFilterButtons();
    renderMealsGrid();

  } catch (err) {
    console.error('Errore caricamento ristorante:', err);
    if (nameEl) nameEl.textContent = 'Impossibile caricare il ristorante';
    if (gridEl) gridEl.innerHTML = `<div class="col-12 text-center py-5 text-danger">Errore durante il recupero dei dati del locale.</div>`;
  }
}

/**
 * Genera i tasti filtro per le categorie dei piatti del ristorante
 */
function renderCategoryFilterButtons() {
  const nav = document.getElementById('restaurant-categories-nav');
  if (!nav) return;

  const categories = [...new Set(allRestaurantMeals.map(m => m.strCategory).filter(Boolean))];
  const t = i18n[currentLang];

  nav.innerHTML = `
    <button class="nav-category-link active" onclick="filterRestaurantMenu('', this)" id="btn-cat-all">${t.btnCatAll}</button>
    ${categories.map(cat => `
      <button class="nav-category-link" onclick="filterRestaurantMenu('${cat}', this)">${cat.toUpperCase()}</button>
    `).join('')}
  `;
}

function filterRestaurantMenu(cat, btn) {
  activeCategoryFilter = cat;
  const buttons = document.querySelectorAll('#restaurant-categories-nav .nav-category-link');
  buttons.forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMealsGrid();
}

/**
 * Renderizza la griglia piatti
 */
function renderMealsGrid() {
  const grid = document.getElementById('restaurant-meals-grid');
  const countLabel = document.getElementById('meals-count-label');
  const t = i18n[currentLang];

  if (!grid) return;

  const filtered = activeCategoryFilter 
    ? allRestaurantMeals.filter(m => m.strCategory === activeCategoryFilter)
    : allRestaurantMeals;

  if (countLabel) countLabel.textContent = `${filtered.length} ${t.dishesCount}`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">${t.noDishes}</div>`;
    return;
  }

  const restId = currentRestaurant ? currentRestaurant._id : '';
  const restName = currentRestaurant ? (currentRestaurant.restaurantName || currentRestaurant.name || 'Locale').replace(/'/g, "\\'") : '';
  const restAddr = currentRestaurant ? (currentRestaurant.restaurantAddress || currentRestaurant.address || '').replace(/'/g, "\\'") : '';

  grid.innerHTML = filtered.map(m => {
    const priceFormatted = (m.price || 0).toFixed(2);
    const thumbUrl = m.strMealThumb || 'https://via.placeholder.com/400x300?text=Food';
    const cleanName = (m.strMeal || 'Piatto').replace(/'/g, "\\'");

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card h-100 border border-dark rounded-0 bg-white">
          <div class="position-relative">
            <img src="${thumbUrl}" class="card-img-top rounded-0" alt="${m.strMeal}" style="aspect-ratio: 4/3; object-fit: cover;">
            <span class="badge bg-black position-absolute top-0 start-0 m-2 rounded-0 small text-uppercase">${m.strCategory || 'PIATTO'}</span>
          </div>

          <div class="card-body p-3 d-flex flex-column justify-content-between">
            <div>
              <h6 class="card-title fw-bold text-uppercase text-truncate mb-1" style="font-family: 'Space Grotesk', sans-serif;">
                ${m.strMeal}
              </h6>
              <div class="fw-bold font-monospace mb-2">€ ${priceFormatted}</div>
              <div class="small text-muted mb-3" style="font-size: 0.75rem;">
                <i class="bi bi-clock"></i> ${m.preparationTime || 15} min prep.
              </div>
            </div>

            <div class="d-flex gap-1">
              <button type="button" class="btn btn-dark rounded-0 btn-sm flex-grow-1 fw-bold text-uppercase py-2" onclick="addDirectItemToSelection('${m._id}', '${cleanName}', ${m.price || 0}, '${thumbUrl}', '${restId}', '${restName}', '${restAddr}')">
                <i class="bi bi-bag-plus"></i> ${t.addCart}
              </button>
              
              <button type="button" class="btn btn-outline-dark rounded-0 btn-sm px-2" onclick="openMealDetailModal('${m._id}')" title="Dettagli">
                <i class="bi bi-eye"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Aggiunge direttamente al carrello associando il ristorante attivo
 */
function addDirectItemToSelection(mealId, name, price, thumb, restId, restName, restAddr) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const existing = cart.find(i => i.mealId === mealId && i.restaurantId === restId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      mealId,
      name,
      price: Number(price) || 0,
      quantity: 1,
      thumb,
      restaurantId: restId,
      restaurantName: restName,
      restaurantAddress: restAddr
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  if (typeof renderDrawerCartUI === 'function') renderDrawerCartUI();

  const cartDrawerEl = document.getElementById('cartOffcanvas');
  if (cartDrawerEl && window.bootstrap) {
    const bsDrawer = bootstrap.Offcanvas.getOrCreateInstance(cartDrawerEl);
    bsDrawer.show();
  }
}

/**
 * Dettaglio del piatto in modale
 */
function openMealDetailModal(mealId) {
  const meal = allRestaurantMeals.find(m => m._id === mealId || m.idMeal === mealId);
  if (!meal) return;

  const modalEl = document.getElementById('modalMealDetail');
  document.getElementById('modal-meal-name').textContent = meal.strMeal;
  document.getElementById('modal-meal-title').textContent = meal.strMeal;
  document.getElementById('modal-meal-category').textContent = meal.strCategory || 'PIATTO';
  document.getElementById('modal-meal-price').textContent = `€ ${(meal.price || 0).toFixed(2)}`;
  document.getElementById('modal-meal-img').src = meal.strMealThumb || 'https://via.placeholder.com/400x300';
  document.getElementById('modal-meal-time').innerHTML = `<i class="bi bi-clock me-1"></i> Tempo di preparazione: <strong>${meal.preparationTime || 15} min</strong>`;

  const ingrStr = Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : (meal.strInstructions || 'Nessuna descrizione disponibile.');
  document.getElementById('modal-meal-desc').textContent = ingrStr;

  const restId = currentRestaurant ? currentRestaurant._id : '';
  const restName = currentRestaurant ? (currentRestaurant.restaurantName || currentRestaurant.name || 'Locale').replace(/'/g, "\\'") : '';
  const restAddr = currentRestaurant ? (currentRestaurant.restaurantAddress || currentRestaurant.address || '').replace(/'/g, "\\'") : '';
  const cleanName = (meal.strMeal || 'Piatto').replace(/'/g, "\\'");

  document.getElementById('modal-meal-actions').innerHTML = `
    <button type="button" class="btn btn-dark rounded-0 w-100 py-2 fw-bold text-uppercase" data-bs-dismiss="modal" onclick="addDirectItemToSelection('${meal._id}', '${cleanName}', ${meal.price || 0}, '${meal.strMealThumb || ''}', '${restId}', '${restName}', '${restAddr}')">
      <i class="bi bi-bag-plus me-1"></i> AGGIUNGI AL CARRELLO
    </button>
  `;

  const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
  bsModal.show();
}

function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Utente';
  const drawerSec = document.getElementById('drawer-user-section');

  if (!drawerSec) return;

  const isIt = currentLang === 'IT';

  if (role === 'restaurant') {
    const statsLink = document.getElementById('drawer-stats-link');
    if (statsLink) statsLink.classList.remove('d-none');
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
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${isIt ? 'Accedi' : 'Login'}</a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${isIt ? 'Registrati' : 'Register'}</a>
    `;
  }
}
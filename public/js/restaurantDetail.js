// public/js/restaurantDetail.js

let restaurantData = null;
let currentMenu = [];
let filteredMenu = [];
let selectedCategory = '';
let searchTerm = '';

let currentLang = localStorage.getItem('appLang') || 'IT';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    badgePartner: 'RISTORANTE PARTNER',
    statusOpen: 'APERTO ORA',
    pickupMode: 'MODALITÀ DI RITIRO',
    pickupDesc: 'RITIRO AL BANCONE DIRETTO',
    prepAvg: 'Prep. media: ',
    badgeMenu: 'MENU DEL LOCALE',
    menuTitle: 'PIATTI PREPARATI DA QUESTO RISTORANTE',
    catAll: 'TUTTO IL MENU',
    mealsCount: 'piatti disponibili',
    noMeals: 'Nessun piatto disponibile nel listino di questo ristorante al momento.',
    btnView: 'VEDI',
    btnCart: '+ CARRELLO',
    btnCartDisabled: 'NON DISP.',
    prep: 'prep',
    emptyCart: 'Il tuo carrello è vuoto.',
    dCatalog: 'CATALOGO COMPLETO',
    dRestaurants: 'I NOSTRI RISTORANTI',
    dOrders: 'I MIEI ORDINI',
    dStats: 'STATISTICHE LOCALE'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    badgePartner: 'PARTNER RESTAURANT',
    statusOpen: 'OPEN NOW',
    pickupMode: 'PICKUP MODE',
    pickupDesc: 'DIRECT COUNTER PICKUP',
    prepAvg: 'Avg. prep: ',
    badgeMenu: 'RESTAURANT MENU',
    menuTitle: 'DISHES PREPARED BY THIS RESTAURANT',
    catAll: 'ALL MENU',
    mealsCount: 'available dishes',
    noMeals: 'No dishes available in this restaurant menu at the moment.',
    btnView: 'VIEW',
    btnCart: '+ ADD',
    btnCartDisabled: 'UNAVAIL.',
    prep: 'prep',
    emptyCart: 'Your cart is empty.',
    dCatalog: 'FULL CATALOG',
    dRestaurants: 'OUR RESTAURANTS',
    dOrders: 'MY ORDERS',
    dStats: 'RESTAURANT STATS'
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  renderLanguageUI();
  renderDrawerAuth();
  renderCartBadge();
  renderDrawerCartUI();
  await loadRestaurantMenu();
  setupBarMovement();
});

function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
  buildCategoriesFilter();
  renderMenuGrid();
  renderDrawerCartUI();
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
  setT('rest-status-badge', t.statusOpen);
  setT('txt-pickup-mode', t.pickupMode);
  setT('txt-pickup-desc', t.pickupDesc);
  setT('txt-badge-menu', t.badgeMenu);
  setT('txt-menu-title', t.menuTitle);
  setT('btn-cat-all', t.catAll);

  setT('txt-d-catalog', t.dCatalog);
  setT('txt-d-restaurants', t.dRestaurants);
  setT('txt-d-orders', t.dOrders);
  setT('txt-d-stats', t.dStats);
}

/**
 * Caricamento menu ristorante e calcolo medio
 */
async function loadRestaurantMenu() {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('id');

  if (!restaurantId) {
    window.location.href = 'restaurantCatalog.html';
    return;
  }

  try {
    const res = await apiRequest(`/restaurants/${restaurantId}/menu`);
    restaurantData = res;
    
    const nameEl = document.getElementById('rest-name-display');
    const addrEl = document.getElementById('rest-addr-display');
    const phoneEl = document.getElementById('rest-phone-display');
    const pivaEl = document.getElementById('rest-piva-display');

    if (nameEl) nameEl.textContent = res.restaurantName || res.name || 'Ristorante Partner';
    if (addrEl) addrEl.innerHTML = `<i class="bi bi-geo-alt text-dark me-1"></i> ${res.restaurantAddress || 'Ritiro al bancone'}`;
    if (phoneEl) phoneEl.innerHTML = `<i class="bi bi-telephone text-dark me-1"></i> ${res.restaurantPhone || res.phone || 'Non disponibile'}`;
    if (pivaEl) pivaEl.innerHTML = `<i class="bi bi-building text-dark me-1"></i> P.IVA: ${res.IVAnumber || res.partitaIva || 'Attiva'}`;

    currentMenu = Array.isArray(res.menu) ? res.menu.filter(Boolean) : [];
    
    // Calcolo dinamico preparazione media
    const prepAvgEl = document.getElementById('txt-prep-time-avg');
    const t = i18n[currentLang];
    if (prepAvgEl) {
      if (currentMenu.length > 0) {
        const totalPrep = currentMenu.reduce((sum, m) => sum + (Number(m.preparationTime) || 15), 0);
        const avg = Math.round(totalPrep / currentMenu.length);
        prepAvgEl.innerHTML = `${t.prepAvg} ${avg} min`;
      } else {
        prepAvgEl.innerHTML = `Nessun piatto`;
      }
    }

    buildCategoriesFilter();
    renderMenuGrid();

  } catch (err) {
    console.error('Errore caricamento menu ristorante:', err);
    document.getElementById('restaurant-meals-grid').innerHTML = `
      <div class="col-12 text-center py-5 text-danger">
        Impossibile caricare il menu di questo locale.
      </div>
    `;
  }
}

function buildCategoriesFilter() {
  const container = document.getElementById('restaurant-categories-nav');
  if (!container) return;

  const t = i18n[currentLang];
  const categories = [...new Set(currentMenu.map(m => m.strCategory).filter(Boolean))];

  container.innerHTML = `
    <button class="nav-category-link ${selectedCategory === '' ? 'active' : ''}" onclick="filterRestaurantMenu('', this)" id="btn-cat-all">
      ${t.catAll}
    </button>
    ${categories.map(cat => `
      <button class="nav-category-link ${selectedCategory === cat ? 'active' : ''}" onclick="filterRestaurantMenu('${cat.replace(/'/g, "\\'")}', this)">
        ${cat.toUpperCase()}
      </button>
    `).join('')}
  `;
}

function filterRestaurantMenu(category, btnEl) {
  selectedCategory = category;
  const allBtns = document.querySelectorAll('#restaurant-categories-nav .nav-category-link');
  allBtns.forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderMenuGrid();
}

/**
 * Rendering Griglia Piatti con controllo Ristoratore
 */
function renderMenuGrid() {
  const grid = document.getElementById('restaurant-meals-grid');
  const countLabel = document.getElementById('meals-count-label');
  const t = i18n[currentLang];
  const role = localStorage.getItem('userRole');
  const isRestaurant = role === 'restaurant';

  if (!grid) return;

  let list = [...currentMenu];

  if (selectedCategory) {
    list = list.filter(m => (m.strCategory || '').toLowerCase() === selectedCategory.toLowerCase());
  }

  if (countLabel) {
    countLabel.textContent = `${list.length} ${t.mealsCount}`;
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${t.noMeals}</div>`;
    return;
  }

  grid.innerHTML = list.map(m => {
    const thumbUrl = m.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    const priceNum = (typeof m.price === 'number' && m.price > 0) ? m.price : (parseFloat(m.price) || 8.50);
    const price = priceNum.toFixed(2);
    const prepTime = m.preparationTime || 15;
    const cleanName = (m.strMeal || 'Piatto').replace(/'/g, "\\'");

    const currentRestId = restaurantData._id || restaurantData.id;
    const currentRestName = (restaurantData.restaurantName || restaurantData.name || 'Ristorante').replace(/'/g, "\\'");

    // Secondo pulsante: attivo se cliente/visitatore, disabilitato se ristoratore
    const cartButtonHtml = isRestaurant
      ? `
        <button type="button" class="btn-card-action btn-card-cart disabled text-muted" style="cursor: not-allowed; opacity: 0.65;" title="${currentLang === 'IT' ? 'Ordini disabilitati per account ristoratore' : 'Ordering disabled for restaurant account'}">
          <i class="bi bi-slash-circle"></i> ${t.btnCartDisabled}
        </button>
      `
      : `
        <button type="button" class="btn-card-action btn-card-cart" onclick="directAddToCart('${m._id}', '${cleanName}', ${priceNum}, '${thumbUrl}', ${prepTime}, '${currentRestId}', '${currentRestName}')">
          <i class="bi bi-bag-plus"></i> ${t.btnCart}
        </button>
      `;

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card">
          
          <div class="product-img-wrapper" onclick="goToMealPage('${m._id}', '${currentRestId}')">
            <img src="${thumbUrl}" alt="${m.strMeal || ''}" loading="lazy">
            <span class="product-tag">${m.strCategory || 'MENU'}</span>
          </div>

          <div class="product-info-body">
            <div class="product-title text-truncate" title="${m.strMeal}">
              ${m.strMeal || 'Piatto'}
            </div>
            <div class="product-price">
              € ${price} 
              <span class="small text-muted fw-normal">&bull; ${prepTime}m ${t.prep}</span>
            </div>
          </div>

          <!-- BOTTONI AZIONE -->
          <div class="card-action-group">
            <button type="button" class="btn-card-action btn-card-view" onclick="goToMealPage('${m._id}', '${currentRestId}')">
              <i class="bi bi-eye"></i> ${t.btnView}
            </button>
            ${cartButtonHtml}
          </div>

        </div>
      </div>
    `;
  }).join('');
}

function goToMealPage(mealId, restId) {
  window.location.href = `meal.html?id=${encodeURIComponent(mealId)}&restaurantId=${encodeURIComponent(restId)}`;
}

/**
 * Aggiunta diretta al carrello (bloccata per ristoratori)
 */
function directAddToCart(id, name, price, thumb, preparationTime, restId, restName) {
  const role = localStorage.getItem('userRole');
  if (role === 'restaurant') return;

  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  const existing = cart.find(i => String(i.id) === String(id) && String(i.restaurantId) === String(restId));

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: String(id),
      name: name,
      price: Number(price),
      thumb: thumb,
      preparationTime: preparationTime || 15,
      restaurantId: restId,
      restaurantName: restName,
      quantity: 1
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartBadge();
  renderDrawerCartUI();

  const cartDrawerEl = document.getElementById('cartOffcanvas');
  if (cartDrawerEl) {
    bootstrap.Offcanvas.getOrCreateInstance(cartDrawerEl).show();
  }
}

function renderCartBadge() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const count = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;
}

window.renderDrawerCartUI = function() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const container = document.getElementById('drawer-cart-items-container');
  const totalQtyEl = document.getElementById('drawer-cart-total-qty');
  const subtotalEl = document.getElementById('drawer-cart-subtotal');
  const t = i18n[currentLang];
  
  const totalQty = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const subtotal = cart.reduce((acc, i) => acc + ((Number(i.price) || 0) * (i.quantity || 1)), 0);

  if (totalQtyEl) totalQtyEl.textContent = totalQty;
  if (subtotalEl) subtotalEl.textContent = `€ ${subtotal.toFixed(2)}`;

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<div class="text-center py-5 text-muted small">${t.emptyCart}</div>`;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="border border-dark p-2 bg-white d-flex align-items-center justify-content-between gap-2">
      <img src="${item.thumb || ''}" alt="${item.name}" style="width: 45px; height: 45px; object-fit: cover;" class="border">
      <div class="flex-grow-1 text-truncate">
        <div class="fw-bold text-uppercase small text-truncate">${item.name}</div>
        <div class="text-muted" style="font-size: 0.7rem;">${item.restaurantName || 'Locale'}</div>
        <div class="font-monospace fw-bold text-dark" style="font-size: 0.8rem;">€ ${(Number(item.price) || 0).toFixed(2)}</div>
      </div>
      <div class="d-flex align-items-center gap-1">
        <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="modifyCartQty('${item.id}', '${item.restaurantId}', -1)">-</button>
        <span class="font-monospace fw-bold px-1 small">${item.quantity}</span>
        <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="modifyCartQty('${item.id}', '${item.restaurantId}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

window.modifyCartQty = function(id, restId, delta) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const item = cart.find(i => String(i.id) === String(id) && String(i.restaurantId) === String(restId));
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => !(String(i.id) === String(id) && String(i.restaurantId) === String(restId)));
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartBadge();
  renderDrawerCartUI();
}

window.clearCart = function() {
  localStorage.setItem('cart', '[]');
  renderCartBadge();
  renderDrawerCartUI();
}

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

function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Utente';
  const drawerSec = document.getElementById('drawer-user-section');

  if (!drawerSec) return;
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
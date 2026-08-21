// public/js/restaurantDetail.js

let restaurantData = null;
let currentMenu = [];
let selectedCategory = '';
let currentLang = localStorage.getItem('appLang') || 'IT';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    badgePartner: 'RISTORANTE PARTNER',
    statusOpen: 'APERTO ORA',
    pickupMode: 'MODALITÀ DI RITIRO',
    pickupDesc: 'RITIRO AL BANCONE DIRETTO',
    prepAvg: 'Prep. media: 15-20 min',
    badgeMenu: 'MENU DEL LOCALE',
    menuTitle: 'PIATTI PREPARATI DA QUESTO RISTORANTE',
    catAll: 'TUTTO IL MENU',
    mealsCount: 'piatti disponibili',
    noMeals: 'Nessun piatto presente nel listino di questo ristorante.',
    btnAddCart: 'AGGIUNGI',
    viewDetails: 'DETTAGLI',
    prep: 'prep',
    emptyCart: 'Il tuo carrello è vuoto.',
    dCatalog: 'CATALOGO COMPLETO',
    dRestaurants: 'I NOSTRI RISTORANTI',
    dOrders: 'I MIEI ORDINI',
    dStats: 'STATISTICHE LOCALE',
    fService: 'SERVIZIO',
    fHow: 'Come Ordinare',
    fPickup: 'Ritiro al Bancone',
    fPartner: 'PARTNER',
    fJoin: 'Diventa un Ristorante Partner',
    fManage: 'Accedi al Gestionale',
    fSupport: 'SUPPORTO',
    fContact: 'Contatta Assistenza',
    fChat: 'Chat 24/7 Attiva',
    fTerms: 'Privacy & Termini'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    badgePartner: 'PARTNER RESTAURANT',
    statusOpen: 'OPEN NOW',
    pickupMode: 'PICKUP MODE',
    pickupDesc: 'DIRECT COUNTER PICKUP',
    prepAvg: 'Avg. prep: 15-20 min',
    badgeMenu: 'RESTAURANT MENU',
    menuTitle: 'DISHES PREPARED BY THIS RESTAURANT',
    catAll: 'ALL MENU',
    mealsCount: 'available dishes',
    noMeals: 'No dishes available in this restaurant menu.',
    btnAddCart: 'ADD TO CART',
    viewDetails: 'DETAILS',
    prep: 'prep',
    emptyCart: 'Your cart is empty.',
    dCatalog: 'FULL CATALOG',
    dRestaurants: 'OUR RESTAURANTS',
    dOrders: 'MY ORDERS',
    dStats: 'RESTAURANT STATS',
    fService: 'SERVICE',
    fHow: 'How to Order',
    fPickup: 'Counter Pickup',
    fPartner: 'PARTNER',
    fJoin: 'Become a Partner Restaurant',
    fManage: 'Access Dashboard',
    fSupport: 'SUPPORT',
    fContact: 'Contact Support',
    fChat: '24/7 Chat Active',
    fTerms: 'Privacy & Terms'
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  renderLanguageUI();
  renderDrawerAuth();
  renderSideCart();
  await loadRestaurantDetails();
});

function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
  renderMenuGrid();
  renderSideCart();
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
  setT('txt-prep-time-avg', t.prepAvg);
  setT('txt-badge-menu', t.badgeMenu);
  setT('txt-menu-title', t.menuTitle);
  setT('btn-cat-all', t.catAll);

  setT('txt-d-catalog', t.dCatalog);
  setT('txt-d-restaurants', t.dRestaurants);
  setT('txt-d-orders', t.dOrders);
  setT('txt-d-stats', t.dStats);

  setT('txt-f-service', t.fService);
  setT('txt-f-how', t.fHow);
  setT('txt-f-pickup', t.fPickup);
  setT('txt-f-partner', t.fPartner);
  setT('txt-f-join', t.fJoin);
  setT('txt-f-manage', t.fManage);
  setT('txt-f-support', t.fSupport);
  setT('txt-f-contact', t.fContact);
  setT('txt-f-chat', t.fChat);
  setT('txt-f-terms', t.fTerms);
}

/**
 * 1. CARICAMENTO DATI DEL RISTORANTE E DEI SUOI PIATTI
 */
async function loadRestaurantDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('id');

  if (!restaurantId) {
    window.location.href = 'restaurantCatalog.html';
    return;
  }

  try {
    // Chiamata alla rotta specifica del menu del ristorante
    const data = await apiRequest(`/restaurants/${restaurantId}/menu`);
    restaurantData = data;

    // Aggiornamento Hero Ristorante
    const nameEl = document.getElementById('rest-name-display');
    const addrEl = document.getElementById('rest-addr-display');
    const phoneEl = document.getElementById('rest-phone-display');
    const pivaEl = document.getElementById('rest-piva-display');

    if (nameEl) nameEl.textContent = data.restaurantName || data.name || 'Ristorante Partner';
    if (addrEl) addrEl.innerHTML = `<i class="bi bi-geo-alt text-dark me-1"></i> ${data.restaurantAddress || 'Ritiro al bancone'}`;
    if (phoneEl) phoneEl.innerHTML = `<i class="bi bi-telephone text-dark me-1"></i> ${data.restaurantPhone || data.phone || 'Non disponibile'}`;
    if (pivaEl) pivaEl.innerHTML = `<i class="bi bi-building text-dark me-1"></i> P.IVA: ${data.IVAnumber || data.partitaIva || 'Attiva'}`;

    // Piatti a menu
    currentMenu = Array.isArray(data.menu) ? data.menu.filter(Boolean) : [];

    buildCategoriesNav();
    renderMenuGrid();

  } catch (err) {
    console.error('Errore caricamento menu ristorante:', err);
    document.getElementById('restaurant-meals-grid').innerHTML = `
      <div class="col-12 text-center py-5 text-danger">
        Errore durante il recupero del menu di questo ristorante.
      </div>
    `;
  }
}

/**
 * 2. BARRA DINAMICA DELLE CATEGORIE
 */
function buildCategoriesNav() {
  const nav = document.getElementById('restaurant-categories-nav');
  if (!nav) return;

  const t = i18n[currentLang];
  const uniqueCategories = [...new Set(currentMenu.map(m => m.strCategory).filter(Boolean))];

  nav.innerHTML = `
    <button class="nav-category-link ${selectedCategory === '' ? 'active' : ''}" onclick="filterRestaurantMenu('', this)" id="btn-cat-all">
      ${t.catAll}
    </button>
    ${uniqueCategories.map(cat => `
      <button class="nav-category-link ${selectedCategory === cat ? 'active' : ''}" onclick="filterRestaurantMenu('${cat}', this)">
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
 * 3. GRIGLIA PIATTI
 */
function renderMenuGrid() {
  const grid = document.getElementById('restaurant-meals-grid');
  const countLabel = document.getElementById('meals-count-label');
  const t = i18n[currentLang];

  if (!grid) return;

  let list = [...currentMenu];
  if (selectedCategory) {
    list = list.filter(m => (m.strCategory || '').toLowerCase() === selectedCategory.toLowerCase());
  }

  if (countLabel) {
    countLabel.textContent = `${list.length} ${t.mealsCount}`;
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5 text-muted small">
        ${t.noMeals}
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(m => {
    const thumb = m.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    const price = (m.price || 0).toFixed(2);
    const cat = m.strCategory || 'PIATTO';
    const prepTime = m.preparationTime || 15;
    const desc = m.description || m.strInstructions || 'Preparato fresco secondo ricetta originale.';
    const cleanName = (m.strMeal || 'Piatto').replace(/'/g, "\\'");

    return `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3">
        <div class="border border-dark bg-white h-100 d-flex flex-column justify-content-between p-3 position-relative">
          
          <div>
            <div class="position-relative mb-2">
              <a href="javascript:void(0)" onclick="openMealModal('${m._id}')">
                <img src="${thumb}" alt="${m.strMeal}" class="w-100" style="aspect-ratio: 4/3; object-fit: cover;" loading="lazy">
              </a>
              <span class="badge bg-black text-white position-absolute top-0 start-0 m-2 rounded-0 small">${cat}</span>
              <span class="badge bg-light text-dark border border-dark position-absolute top-0 end-0 m-2 rounded-0 small">
                <i class="bi bi-clock"></i> ${prepTime}m ${t.prep}
              </span>
            </div>

            <div class="fw-bold text-uppercase text-truncate mb-1" style="font-family: 'Space Grotesk', sans-serif; cursor: pointer;" onclick="openMealModal('${m._id}')">
              ${m.strMeal}
            </div>

            <div class="fw-bold font-monospace mb-2" style="font-size: 1.15rem;">
              € ${price}
            </div>

            <p class="small text-muted mb-3 text-truncate" style="font-size: 0.8rem;" title="${desc}">
              ${desc}
            </p>
          </div>

          <div class="border-top pt-2 mt-auto d-flex gap-2">
            <button type="button" class="btn btn-outline-dark btn-sm rounded-0 w-50 fw-bold small text-uppercase py-2" onclick="openMealModal('${m._id}')">
              ${t.viewDetails}
            </button>
            <button type="button" class="btn btn-dark btn-sm rounded-0 w-50 fw-bold small text-uppercase py-2" onclick="addToCart('${m._id}', '${cleanName}', ${m.price || 0}, '${thumb}', ${prepTime})">
              <i class="bi bi-plus me-1"></i> ${t.btnAddCart}
            </button>
          </div>

        </div>
      </div>
    `;
  }).join('');
}

/**
 * 4. MODALE DETTAGLIO PIATTO
 */
function openMealModal(mealId) {
  const meal = currentMenu.find(m => String(m._id) === String(mealId));
  if (!meal) return;

  const t = i18n[currentLang];
  const thumb = meal.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  const price = (meal.price || 0).toFixed(2);
  const cleanName = (meal.strMeal || 'Piatto').replace(/'/g, "\\'");
  const ingr = Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : (meal.ingredients || 'Non specificati');
  const desc = meal.description || meal.strInstructions || 'Nessuna descrizione specificata.';

  document.getElementById('modal-meal-img').src = thumb;
  document.getElementById('modal-meal-category').textContent = meal.strCategory || 'PIATTO';
  document.getElementById('modal-meal-title').textContent = meal.strMeal;
  document.getElementById('modal-meal-price').textContent = `€ ${price}`;
  document.getElementById('modal-meal-time').innerHTML = `<i class="bi bi-clock me-1"></i> Tempo di preparazione: <strong>${meal.preparationTime || 15} min</strong>`;
  
  document.getElementById('modal-meal-desc').innerHTML = `
    <strong>Descrizione:</strong> ${desc}<br><br>
    <strong>Ingredienti:</strong> ${ingr}
  `;

  document.getElementById('modal-meal-actions').innerHTML = `
    <button type="button" class="btn btn-dark rounded-0 w-100 py-2 fw-bold text-uppercase" onclick="addToCart('${meal._id}', '${cleanName}', ${meal.price || 0}, '${thumb}', ${meal.preparationTime || 15}); bootstrap.Modal.getInstance(document.getElementById('modalMealDetail')).hide();">
      <i class="bi bi-box-seam me-1"></i> ${t.btnAddCart} (€ ${price})
    </button>
  `;

  const modal = new bootstrap.Modal(document.getElementById('modalMealDetail'));
  modal.show();
}

/**
 * 5. GESTIONE CARRELLO (SIDE-CART)
 */
function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  renderSideCart();
}

function addToCart(mealId, name, price, thumb, preparationTime) {
  const urlParams = new URLSearchParams(window.location.search);
  const restId = urlParams.get('id');
  const restName = restaurantData ? (restaurantData.restaurantName || restaurantData.name || 'Ristorante') : 'Ristorante';

  let cart = getCart();
  const existing = cart.find(i => String(i.id) === String(mealId));

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: mealId,
      name,
      price: Number(price),
      thumb,
      preparationTime: preparationTime || 15,
      restaurantId: restId,
      restaurantName: restName,
      quantity: 1
    });
  }

  saveCart(cart);

  // Apre automaticamente il drawer del carrello
  const cartOffcanvasEl = document.getElementById('cartOffcanvas');
  if (cartOffcanvasEl) {
    const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(cartOffcanvasEl);
    bsOffcanvas.show();
  }
}

function changeCartQty(mealId, delta) {
  let cart = getCart();
  const item = cart.find(i => String(i.id) === String(mealId));
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => String(i.id) !== String(mealId));
  }

  saveCart(cart);
}

function clearCart() {
  localStorage.setItem('cart', '[]');
  renderSideCart();
}

function renderSideCart() {
  const cart = getCart();
  const container = document.getElementById('drawer-cart-items-container');
  const totalQtyEl = document.getElementById('drawer-cart-total-qty');
  const badgeEl = document.getElementById('cart-badge');
  const subtotalEl = document.getElementById('drawer-cart-subtotal');
  const t = i18n[currentLang];

  const totalQty = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const subtotal = cart.reduce((acc, i) => acc + ((i.price || 0) * (i.quantity || 1)), 0);

  if (totalQtyEl) totalQtyEl.textContent = totalQty;
  if (badgeEl) badgeEl.textContent = totalQty;
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
        <div class="font-monospace text-muted small">€ ${(item.price || 0).toFixed(2)}</div>
      </div>
      <div class="d-flex align-items-center gap-1">
        <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="changeCartQty('${item.id}', -1)">-</button>
        <span class="font-monospace fw-bold px-1 small">${item.quantity}</span>
        <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="changeCartQty('${item.id}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

/**
 * 6. DRAWER AUTENTICAZIONE
 */
function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Utente';
  const drawerSec = document.getElementById('drawer-user-section');
  const statsLink = document.getElementById('drawer-stats-link');

  if (statsLink && role === 'restaurant') {
    statsLink.classList.remove('d-none');
  }

  if (!drawerSec) return;
  const isIt = currentLang === 'IT';

  if (token) {
    drawerSec.innerHTML = `
      <div class="small text-muted mb-1 text-uppercase" style="font-size: 0.75rem;">${isIt ? 'Accesso effettuato come:' : 'Logged in as:'}</div>
      <div class="fw-bold text-uppercase mb-3" style="font-family: 'Space Grotesk', sans-serif;">
        ${name} <span class="badge bg-black rounded-0 ms-1">${role}</span>
      </div>
      <a href="profile.html" class="btn btn-dark rounded-0 w-100 py-2 mb-2 fw-bold text-uppercase d-flex justify-content-between align-items-center" style="font-size: 0.8rem;">
        <span>${isIt ? 'Vedi il mio profilo' : 'View profile'}</span>
        <i class="bi bi-arrow-right"></i>
      </a>
      <button class="btn btn-outline-dark rounded-0 w-100 btn-sm py-2 fw-bold text-uppercase" onclick="logout()">
        Logout
      </button>
    `;
  } else {
    drawerSec.innerHTML = `
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${isIt ? 'Accedi' : 'Login'}</a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${isIt ? 'Registrati' : 'Register'}</a>
    `;
  }
}
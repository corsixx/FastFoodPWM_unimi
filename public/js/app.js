// public/js/app.js

let currentCategory = '';
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentLang = localStorage.getItem('appLang') || 'IT';
let allLoadedMeals = []; // Cache in memoria per aprire al volo la modale di dettaglio
let mealModalInstance = null;

// Dizionario testi IT/EN interno
const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    heroBadge: 'CATALOGO PIATTI',
    heroCta: 'SCOPRI IL MENU COMPLETO →',
    recomTitle: 'SCELTI PER TE (IN BACHECA)',
    popularTitle: 'NEW IN / I PIÙ POPOLARI',
    viewAll: 'Vedi Tutto il Menu',
    allCat: 'ALL / TUTTO',
    prep: 'prep',
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
    heroBadge: 'FULL CATALOG',
    heroCta: 'EXPLORE FULL MENU →',
    recomTitle: 'CHOSEN FOR YOU (RECOMMENDED)',
    popularTitle: 'NEW IN / MOST POPULAR',
    viewAll: 'View Full Menu',
    allCat: 'ALL',
    prep: 'prep',
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

// AVVIO APPLICAZIONE
document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('modalMealDetail');
  if (modalEl && typeof bootstrap !== 'undefined') {
    mealModalInstance = new bootstrap.Modal(modalEl);
  }

  renderLanguageUI();
  renderCartBadge();
  loadBackendCategories();
  loadCatalog();
  loadRecommendations();
  renderDrawerAuth();
  setupBarMovement();
});

/**
 * 1. CAMBIO LINGUA ISTANTANEO
 */
function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
  loadCatalog();
  loadRecommendations();
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
  setT('txt-hero-badge', t.heroBadge);
  setT('txt-hero-cta', t.heroCta);
  setT('txt-recom-title', t.recomTitle);
  setT('txt-popular-title', t.popularTitle);
  setT('txt-view-all', t.viewAll);
  setT('btn-cat-all', t.allCat);
  setT('txt-modal-desc', t.modalDesc);
  setT('txt-modal-add', t.modalAdd);

  // Footer & Modali
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

  // Drawer
  setT('txt-d-catalog', t.dCatalog);
  setT('txt-d-restaurants', t.dRestaurants);
  setT('txt-d-orders', t.dOrders);
  setT('txt-d-stats', t.dStats);
}

/**
 * 2. MOVIMENTO BARRA CATEGORIE SU COMPUTER
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
 * 3. CARICA CATEGORIE DA MONGODB
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
 * 4. HELPER CREAZIONE CARD PIATTO (CON TASTI "VEDI" E "+ CARRELLO")
 */
function createProductCardHtml(meal, prepLabel, customTag = null) {
  const tag = customTag || meal.strCategory || 'MENU';
  const tagStyle = customTag ? 'style="background-color: var(--ff-yellow); color: #000;"' : '';
  const img = meal.strMealThumb || 'https://via.placeholder.com/400x500?text=FastFood';
  const nameSafe = (meal.strMeal || 'Piatto').replace(/'/g, "\\'");
  const priceSafe = typeof meal.price === 'number' ? meal.price.toFixed(2) : '0.00';
  const timeSafe = meal.preparationTime || 10;
  const t = i18n[currentLang];

  return `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="product-card">
        
        <!-- Immagine cliccabile per aprire i dettagli -->
        <div class="product-img-wrapper" onclick="openMealDetails('${meal._id}')">
          <img src="${img}" alt="${meal.strMeal || ''}" loading="lazy">
          <span class="product-tag" ${tagStyle}>${tag}</span>
        </div>

        <div class="product-info-body">
          <div class="product-title">${meal.strMeal || 'Piatto'}</div>
          <div class="product-price">€ ${priceSafe} &bull; <span class="small">${timeSafe}m ${prepLabel}</span></div>
        </div>

        <!-- GRUPPO TASTI VEDI & + CARRELLO -->
        <div class="card-action-group">
          <button type="button" class="btn-card-action btn-card-view" onclick="openMealDetails('${meal._id}')">
            <i class="bi bi-eye"></i> ${t.btnView}
          </button>
          <button type="button" class="btn-card-action btn-card-cart" onclick="addToCart('${meal._id}', '${nameSafe}', ${meal.price || 0})">
            <i class="bi bi-bag-plus"></i> ${t.btnCart}
          </button>
        </div>

      </div>
    </div>
  `;
}

/**
 * 5. CARICAMENTO MAX 16 PIATTI
 */
async function loadCatalog() {
  const grid = document.getElementById('meals-grid');
  if (!grid) return;

  const t = i18n[currentLang];
  grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${currentLang === 'IT' ? 'CARICAMENTO IN CORSO...' : 'LOADING ITEMS...'}</div>`;

  try {
    const query = currentCategory ? `?category=${encodeURIComponent(currentCategory)}` : '';
    const meals = await apiRequest(`/meals${query}`);

    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${currentLang === 'IT' ? 'NESSUN PRODOTTO PRESENTE.' : 'NO ITEMS AVAILABLE.'}</div>`;
      return;
    }

    // Salva nella cache per la modale
    meals.forEach(m => {
      if (!allLoadedMeals.find(x => x._id === m._id)) {
        allLoadedMeals.push(m);
      }
    });

    grid.innerHTML = meals.slice(0, 16).map(m => createProductCardHtml(m, t.prep)).join('');
  } catch (err) {
    grid.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore caricamento piatti.</div>`;
  }
}

/**
 * 6. CARICAMENTO BACHECA CONSIGLIATI
 */
async function loadRecommendations() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  if (!token || role !== 'customer') return;

  try {
    const data = await apiRequest('/meals/recommendations');
    if (data && data.recommendations && data.recommendations.length > 0) {
      const wrapper = document.getElementById('recommendations-wrapper');
      const prefLabel = document.getElementById('user-pref-label');
      const container = document.getElementById('recommendations-container');

      if (wrapper) wrapper.classList.remove('d-none');
      if (prefLabel) prefLabel.textContent = `${data.favoriteCategory || 'In evidenza'}`;
      
      const t = i18n[currentLang];

      data.recommendations.forEach(m => {
        if (!allLoadedMeals.find(x => x._id === m._id)) {
          allLoadedMeals.push(m);
        }
      });

      if (container) {
        container.innerHTML = data.recommendations.slice(0, 4)
          .map(m => createProductCardHtml(m, t.prep, 'TOP'))
          .join('');
      }
    }
  } catch (e) {
    // Silenzioso
  }
}

/**
 * 7. APRE LA MODALE DI DETTAGLIO PIATTO (VIEW)
 */
function openMealDetails(mealId) {
  const meal = allLoadedMeals.find(m => m._id === mealId);
  if (!meal) return;

  const t = i18n[currentLang];

  const modalName = document.getElementById('modal-meal-name');
  const modalTitle = document.getElementById('modal-meal-title');
  const modalCategory = document.getElementById('modal-meal-category');
  const modalPrice = document.getElementById('modal-meal-price');
  const modalImg = document.getElementById('modal-meal-img');
  const modalTime = document.getElementById('modal-meal-time');
  const modalDesc = document.getElementById('modal-meal-desc');
  const btnAdd = document.getElementById('modal-btn-add-cart');

  if (modalName) modalName.textContent = meal.strMeal || 'DETTAGLIO PIATTO';
  if (modalTitle) modalTitle.textContent = meal.strMeal || 'Piatto';
  if (modalCategory) modalCategory.textContent = meal.strCategory || 'MENU';
  if (modalPrice) modalPrice.textContent = `€ ${(meal.price || 0).toFixed(2)}`;
  if (modalImg) modalImg.src = meal.strMealThumb || 'https://via.placeholder.com/400x300?text=FastFood';
  
  if (modalTime) {
    modalTime.innerHTML = `<i class="bi bi-clock me-1"></i> ${t.prepTimeLabel} <strong>${meal.preparationTime || 10} min</strong>`;
  }

  if (modalDesc) {
    modalDesc.textContent = meal.strInstructions || 'Nessuna descrizione o ingrediente disponibile.';
  }

  if (btnAdd) {
    btnAdd.onclick = () => {
      addToCart(meal._id, meal.strMeal || 'Piatto', meal.price || 0);
      if (mealModalInstance) mealModalInstance.hide();
    };
  }

  if (mealModalInstance) {
    mealModalInstance.show();
  }
}

/**
 * 8. FILTRI
 */
function filterCategory(categoryName, btnElement) {
  currentCategory = categoryName;
  document.querySelectorAll('.nav-category-link').forEach(el => el.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  loadCatalog();
}

/**
 * 9. CARRELLO
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
 * 10. STATO DRAWER AUTENTICAZIONE
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
let currentCategory = '';
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentLang = localStorage.getItem('appLang') || 'IT';

const translations = {
  IT: {
    currentFlag: 'IT 🇮🇹',
    topAnnouncement: 'Supporto in Chat 24/7 &bull; Ordini al Bancone & Asporto Rapido',
    heroBadge: 'CATALOGO PIATTI',
    heroCta: 'SCOPRI IL MENU COMPLETO &rarr;',
    recomHeading: 'SCELTI PER TE (IN BACHECA)',
    popularHeading: 'NEW IN / I PIÙ POPOLARI',
    viewAll: 'Vedi Tutto il Menu',
    allCategories: 'ALL / TUTTO',
    prepTime: 'prep',
    drawerCatalog: 'CATALOGO COMPLETO',
    drawerRestaurants: 'I NOSTRI RISTORANTI',
    drawerOrders: 'I MIEI ORDINI',
    drawerStats: 'STATISTICHE LOCALE',
    loginBtn: 'ACCEDI',
    regBtn: 'REGISTRATI',
    logoutBtn: 'LOGOUT',
    loggedInAs: 'ACCESSO EFFETTUATO COME:',
    footerService: 'SERVIZIO',
    footerHow: 'Come Ordinare',
    footerPickup: 'Ritiro al Bancone',
    footerWait: 'Tempi di Attesa',
    footerPartner: 'PARTNER',
    footerJoin: 'Diventa un Ristorante Partner',
    footerManage: 'Accedi al Gestionale',
    footerSupport: 'SUPPORTO',
    footerHelp: 'Contatta Assistenza',
    footerChat: 'Chat 24/7 Attiva',
    modalInfoTitle: 'Informazioni Servizio',
    modalInfoBody: 'Scegli i piatti dal menu, inoltra l\'ordine e ritira direttamente al punto cassa senza code. I tempi di attesa sono calcolati in tempo reale in base agli ordini in cucina.',
    modalLegalTitle: 'Termini & Note Legali',
    modalLegalBody: 'Piattaforma protetta con autenticazione JWT. Tutti i dati degli utenti e gli ordini sono gestiti in modo sicuro su database.'
  },
  EN: {
    currentFlag: 'EN 🇬🇧',
    topAnnouncement: '24/7 Live Chat Support &bull; Counter Pickup & Express Takeout',
    heroBadge: 'FULL CATALOG',
    heroCta: 'EXPLORE FULL MENU &rarr;',
    recomHeading: 'CHOSEN FOR YOU (RECOMMENDED)',
    popularHeading: 'NEW IN / MOST POPULAR',
    viewAll: 'View Full Menu',
    allCategories: 'ALL',
    prepTime: 'prep',
    drawerCatalog: 'FULL CATALOG',
    drawerRestaurants: 'OUR RESTAURANTS',
    drawerOrders: 'MY ORDERS',
    drawerStats: 'RESTAURANT STATS',
    loginBtn: 'LOGIN',
    regBtn: 'REGISTER',
    logoutBtn: 'LOGOUT',
    loggedInAs: 'LOGGED IN AS:',
    footerService: 'SERVICE',
    footerHow: 'How to Order',
    footerPickup: 'Counter Pickup',
    footerWait: 'Wait Times',
    footerPartner: 'PARTNER',
    footerJoin: 'Become a Partner Restaurant',
    footerManage: 'Access Dashboard',
    footerSupport: 'SUPPORT',
    footerHelp: 'Contact Support',
    footerChat: '24/7 Chat Active',
    modalInfoTitle: 'Service Information',
    modalInfoBody: 'Choose dishes from the menu, place your order and pick up at the counter with no queue. Wait times are calculated in real time based on kitchen load.',
    modalLegalTitle: 'Terms & Legal Notes',
    modalLegalBody: 'Secure platform protected by JWT authentication. User data and orders are stored securely in the database.'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(currentLang);
  renderCartBadge();
  loadBackendCategories();
  loadCatalog();
  loadRecommendations();
  renderDrawerAuth();
  setupHorizontalWheelScroll();
});

/**
 * CAMBIO LINGUA (IT <-> EN)
 */
function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  applyLanguage(currentLang);
  renderDrawerAuth();
  loadCatalog();
  loadBackendCategories();
}

function applyLanguage(lang) {
  const t = translations[lang];

  const setHtml = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  const setText = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setText('lang-current', t.currentFlag);
  setHtml('top-announcement', t.topAnnouncement);
  setText('hero-badge', t.heroBadge);
  setHtml('hero-cta-btn', t.heroCta);
  setText('recom-heading', t.recomHeading);
  setText('section-popular-heading', t.popularHeading);
  setText('link-view-all', t.viewAll);
  setText('btn-all-categories', t.allCategories);

  // Footer & Modali
  setText('footer-title-service', t.footerService);
  setText('footer-link-how', t.footerHow);
  setText('footer-link-pickup', t.footerPickup);
  setText('footer-link-wait', t.footerWait);
  setText('footer-title-partner', t.footerPartner);
  setText('footer-link-partner', t.footerJoin);
  setText('footer-link-manage', t.footerManage);
  setText('footer-title-support', t.footerSupport);
  setText('footer-link-help', t.footerHelp);
  setText('footer-link-chat', t.footerChat);
  setText('modal-info-title', t.modalInfoTitle);
  setText('modal-info-body', t.modalInfoBody);
  setText('modal-legal-title', t.modalLegalTitle);
  setText('modal-legal-body', t.modalLegalBody);

  // Drawer
  setText('drawer-catalog-link', t.drawerCatalog);
  setText('drawer-restaurants-link', t.drawerRestaurants);
  setText('drawer-orders-link', t.drawerOrders);
}

/**
 * SCORRIMENTO ORIZZONTALE BARRA
 */
function setupHorizontalWheelScroll() {
  const scrollNav = document.getElementById('categories-nav');
  if (scrollNav) {
    scrollNav.addEventListener('wheel', (evt) => {
      evt.preventDefault();
      scrollNav.scrollLeft += evt.deltaY;
    }, { passive: false });
  }
}

/**
 * CARICAMENTO CATEGORIE DA MONGODB
 */
async function loadBackendCategories() {
  const navContainer = document.getElementById('categories-nav');
  try {
    const categories = await apiRequest('/meals/categories');
    const t = translations[currentLang];
    
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const dynamicButtons = categories.map(cat => `
        <button class="nav-category-link ${currentCategory === cat ? 'active' : ''}" onclick="filterCategory('${cat.replace(/'/g, "\\'")}', this)">
          ${cat.toUpperCase()}
        </button>
      `).join('');

      navContainer.innerHTML = `
        <button class="nav-category-link ${currentCategory === '' ? 'active' : ''}" onclick="filterCategory('', this)" id="btn-all-categories">${t.allCategories}</button>
        ${dynamicButtons}
      `;
    }
  } catch (error) {
    console.error("Impossibile caricare le categorie:", error);
  }
}

/**
 * CARICAMENTO FINO A 16 PIATTI
 */
async function loadCatalog() {
  const grid = document.getElementById('meals-grid');
  if (!grid) return;

  const t = translations[currentLang];
  grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${currentLang === 'IT' ? 'CARICAMENTO IN CORSO...' : 'LOADING ITEMS...'}</div>`;

  try {
    let url = '/meals';
    if (currentCategory) {
      url += `?category=${encodeURIComponent(currentCategory)}`;
    }

    const meals = await apiRequest(url);

    if (!meals || meals.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${currentLang === 'IT' ? 'NESSUN PRODOTTO PRESENTE.' : 'NO ITEMS AVAILABLE.'}</div>`;
      return;
    }

    const limitedMeals = meals.slice(0, 16);

    grid.innerHTML = limitedMeals.map(m => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card" onclick="addToCart('${m._id}', '${m.strMeal.replace(/'/g, "\\'")}', ${m.price})">
          <div class="product-img-wrapper">
            <img src="${m.strMealThumb || 'https://via.placeholder.com/400x500?text=FastFood'}" alt="${m.strMeal}" loading="lazy">
            <span class="product-tag">${m.strCategory || 'MENU'}</span>
          </div>
          <div class="product-title">${m.strMeal}</div>
          <div class="product-price">€ ${m.price.toFixed(2)} &bull; <span class="small">${m.preparationTime || 10}m ${t.prepTime}</span></div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    grid.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore di caricamento.</div>`;
  }
}

/**
 * CARICAMENTO BACHECA CONSIGLIATI
 */
async function loadRecommendations() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  if (!token || role !== 'customer') return;

  try {
    const data = await apiRequest('/meals/recommendations');
    if (data.recommendations && data.recommendations.length > 0) {
      document.getElementById('recommendations-wrapper').classList.remove('d-none');
      document.getElementById('user-pref-label').textContent = `${data.favoriteCategory || 'In evidenza'}`;
      
      const container = document.getElementById('recommendations-container');
      container.innerHTML = data.recommendations.slice(0, 4).map(m => `
        <div class="col-6 col-md-3">
          <div class="product-card" onclick="addToCart('${m._id}', '${m.strMeal.replace(/'/g, "\\'")}', ${m.price})">
            <div class="product-img-wrapper">
              <img src="${m.strMealThumb}" alt="${m.strMeal}">
              <span class="product-tag" style="background-color: var(--ff-yellow); color: #000;">TOP</span>
            </div>
            <div class="product-title">${m.strMeal}</div>
            <div class="product-price">€ ${m.price.toFixed(2)}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    // Silenzioso
  }
}

/**
 * FILTRI
 */
function filterCategory(categoryName, btnElement) {
  currentCategory = categoryName;

  document.querySelectorAll('.nav-category-link').forEach(el => el.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  }

  loadCatalog();
}

/**
 * CARRELLO
 */
function addToCart(mealId, name, price) {
  const existing = cart.find(item => item.mealId === mealId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ mealId, name, price, quantity: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartBadge();

  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.classList.add('bg-warning', 'text-dark');
    setTimeout(() => badge.classList.remove('bg-warning', 'text-dark'), 300);
  }
}

function renderCartBadge() {
  const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = totalItems;
}

/**
 * STATO AUTENTICAZIONE DRAWER
 */
function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName');
  const drawerSec = document.getElementById('drawer-user-section');
  const t = translations[currentLang];

  if (!drawerSec) return;

  if (role === 'restaurant') {
    const statsLink = document.getElementById('drawer-stats-link');
    const ordersLink = document.getElementById('drawer-orders-link');
    if (statsLink) statsLink.classList.remove('d-none');
    if (ordersLink) ordersLink.textContent = t.drawerStats;
  }

  if (token) {
    drawerSec.innerHTML = `
      <div class="small text-muted mb-1">${t.loggedInAs}</div>
      <div class="fw-bold text-uppercase mb-3">${name || 'Utente'} (${role})</div>
      <button class="btn btn-outline-dark rounded-0 w-100 btn-sm" onclick="logout()">${t.logoutBtn}</button>
    `;
  } else {
    drawerSec.innerHTML = `
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${t.loginBtn}</a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${t.regBtn}</a>
    `;
  }
}
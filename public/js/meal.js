// public/js/meal.js

let currentMeal = null;
let quantity = 1;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentLang = localStorage.getItem('appLang') || 'IT';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    backCatalog: 'Torna al Menu Completo',
    loading: 'CARICAMENTO DETTAGLI PIATTO...',
    notFound: 'PIATTO NON TROVATO O ID MANCANTE NELL\'URL.',
    prepTime: 'Tempo di preparazione:',
    ingredientsTitle: 'Ingredienti & Dosi',
    instructionsTitle: 'Istruzioni & Preparazione',
    noIngredients: 'Nessuna lista ingredienti dettagliata disponibile.',
    noInstructions: 'Nessuna istruzione di preparazione disponibile.',
    restaurantTitle: 'PREPARATO DA // RISTORANTE PARTNER',
    noRestTitle: 'STATO DISPONIBILITÀ // FUORI MENU',
    noRestNotice: 'Questo piatto fa parte dell\'archivio ricette ma al momento nessun ristorante partner lo ha inserito nel proprio menu d\'asporto.',
    restaurantPickup: 'Indirizzo per il ritiro:',
    viewRestMenu: 'VEDI TUTTI I PIATTI DI QUESTO LOCALE →',
    qtyLabel: 'Quantità',
    btnAddCart: 'AGGIUNGI ALL\'ORDINE',
    btnUnavailable: 'ATTUALMENTE NON ORDINABILE',
    addedSuccess: 'PIATTO AGGIUNTO AL CARRELLO!',
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
    backCatalog: 'Back to Full Menu',
    loading: 'LOADING MEAL DETAILS...',
    notFound: 'MEAL NOT FOUND OR MISSING ID IN URL.',
    prepTime: 'Preparation time:',
    ingredientsTitle: 'Ingredients & Measures',
    instructionsTitle: 'Instructions & Cooking',
    noIngredients: 'No detailed ingredients available.',
    noInstructions: 'No preparation steps available.',
    restaurantTitle: 'PREPARED BY // PARTNER RESTAURANT',
    noRestTitle: 'AVAILABILITY // OFF MENU',
    noRestNotice: 'This dish is part of the recipe catalog, but currently no partner restaurant is serving it for takeout.',
    restaurantPickup: 'Pickup address:',
    viewRestMenu: 'VIEW ALL DISHES FROM THIS RESTAURANT →',
    qtyLabel: 'Quantity',
    btnAddCart: 'ADD TO ORDER',
    btnUnavailable: 'CURRENTLY NOT ORDERABLE',
    addedSuccess: 'ADDED TO CART!',
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
  renderLanguageUI();
  renderCartBadge();
  loadMealFromUrl();
  renderDrawerAuth();
});

function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
  if (currentMeal) renderMealDetail(currentMeal);
}

function renderLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('lang-btn', t.btn);
  setT('txt-announcement', t.announcement);
  setT('txt-back-catalog', t.backCatalog);

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

async function loadMealFromUrl() {
  const container = document.getElementById('meal-detail-container');
  if (!container) return;

  const t = i18n[currentLang];
  const urlParams = new URLSearchParams(window.location.search);
  const mealId = urlParams.get('id');

  if (!mealId || mealId === 'undefined' || mealId === 'null') {
    container.innerHTML = `<div class="col-12 text-center py-5 text-muted">${t.notFound}</div>`;
    return;
  }

  try {
    const response = await apiRequest(`/meals/${encodeURIComponent(mealId)}`);
    const mealData = response && response.meal ? response.meal : response;

    if (!mealData || mealData.message || (!mealData.strMeal && !mealData._id)) {
      container.innerHTML = `<div class="col-12 text-center py-5 text-muted">${t.notFound}</div>`;
      return;
    }

    currentMeal = mealData;
    renderMealDetail(mealData);
  } catch (err) {
    console.error('Errore fetch piatto:', err);
    container.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore nel recupero del piatto.</div>`;
  }
}

/**
 * Estrae gli ingredienti formattati da qualsiasi struttura dati
 */
function extractIngredientsList(meal) {
  const items = [];

  // Caso 1: array strutturato ingredients e measures
  if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
    meal.ingredients.forEach((ing, idx) => {
      if (ing && ing.trim() !== '') {
        const measure = (meal.measures && meal.measures[idx]) ? meal.measures[idx].trim() : '';
        items.push(measure ? `${ing.trim()} (${measure})` : ing.trim());
      }
    });
  }

  // Caso 2: campi stile TheMealDB (strIngredient1..20 e strMeasure1..20)
  if (items.length === 0) {
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ing && ing.trim() !== '') {
        const mText = measure && measure.trim() !== '' ? ` (${measure.trim()})` : '';
        items.push(`${ing.trim()}${mText}`);
      }
    }
  }

  return items;
}

function renderMealDetail(meal) {
  const container = document.getElementById('meal-detail-container');
  if (!container) return;

  const t = i18n[currentLang];
  const img = meal.strMealThumb || 'https://via.placeholder.com/600x600?text=FastFood';
  const name = meal.strMeal || 'Piatto';
  const category = meal.strCategory || 'MENU';
  const price = typeof meal.price === 'number' ? meal.price.toFixed(2) : '0.00';
  const prepTime = meal.preparationTime || 10;
  const instructions = meal.strInstructions || t.noInstructions;

  const ingredients = extractIngredientsList(meal);
  const hasRestaurant = meal.restaurant && meal.restaurant._id;
  const rest = meal.restaurant || null;

  // Render lista ingredienti
  const ingredientsHtml = ingredients.length > 0
    ? `<div class="d-flex flex-wrap gap-2 mb-3">
        ${ingredients.map(ing => `
          <span class="badge bg-light text-dark border rounded-0 px-2 py-1 small" style="font-weight: 500;">
            • ${ing}
          </span>
        `).join('')}
      </div>`
    : `<p class="small text-muted mb-3">${t.noIngredients}</p>`;

  container.innerHTML = `
    <!-- IMMAGINE & BOX RISTORANTE -->
    <div class="col-12 col-md-6 col-lg-7">
      <div class="border" style="background-color: var(--ff-gray-bg); overflow: hidden;">
        <img src="${img}" alt="${name}" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block;">
      </div>

      <!-- BOX STATO RISTORANTE -->
      <div class="border border-dark mt-4 p-4 ${hasRestaurant ? 'bg-light' : 'bg-white'}">
        <div class="small fw-bold text-uppercase text-muted mb-1" style="letter-spacing: 0.05em;">
          ${hasRestaurant ? t.restaurantTitle : t.noRestTitle}
        </div>
        
        ${hasRestaurant ? `
          <h5 class="fw-bold text-uppercase mb-2" style="font-family: 'Space Grotesk', sans-serif;">
            ${rest.name}
          </h5>
          <div class="small text-muted mb-2">
            <i class="bi bi-geo-alt me-1 text-dark"></i> ${t.restaurantPickup} <strong>${rest.address}</strong>
            ${rest.phone ? `<span class="ms-3"><i class="bi bi-telephone me-1 text-dark"></i> ${rest.phone}</span>` : ''}
          </div>
          <a href="catalog.html?restaurant=${encodeURIComponent(rest._id)}" class="small fw-bold text-dark text-decoration-underline text-uppercase d-inline-block mt-2">
            ${t.viewRestMenu}
          </a>
        ` : `
          <p class="small text-muted m-0">
            <i class="bi bi-info-circle me-1 text-dark"></i> ${t.noRestNotice}
          </p>
        `}
      </div>
    </div>

    <!-- SCHEDA INFORMAZIONI, INGREDIENTI E ACQUISTO -->
    <div class="col-12 col-md-6 col-lg-5 d-flex flex-column justify-content-between">
      <div>
        <div class="d-flex align-items-center gap-2 mb-2">
          <span class="badge bg-black rounded-0 text-uppercase py-1 px-2" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.05em;">
            ${category}
          </span>
          ${hasRestaurant ? `
            <span class="badge bg-success rounded-0 text-uppercase py-1 px-2">DISPONIBILE</span>
          ` : `
            <span class="badge bg-secondary rounded-0 text-uppercase py-1 px-2">FUORI MENU</span>
          `}
        </div>
        
        <h2 class="fw-bold text-uppercase mb-2" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em;">
          ${name}
        </h2>
        
        <div class="fs-4 fw-bold mb-3">€ ${price}</div>

        <div class="small text-muted mb-4 pb-3 border-bottom">
          <i class="bi bi-clock me-1"></i> ${t.prepTime} <strong>${prepTime} min</strong>
        </div>

        <!-- SEZIONE INGREDIENTI -->
        <div class="mb-4">
          <h6 class="fw-bold text-uppercase small mb-2" style="font-family: 'Space Grotesk', sans-serif;">
            <i class="bi bi-egg-fried me-1"></i> ${t.ingredientsTitle}
          </h6>
          ${ingredientsHtml}
        </div>

        <!-- SEZIONE PREPARAZIONE -->
        <div class="mb-4">
          <h6 class="fw-bold text-uppercase small mb-2" style="font-family: 'Space Grotesk', sans-serif;">
            <i class="bi bi-journal-text me-1"></i> ${t.instructionsTitle}
          </h6>
          <p class="small text-muted" style="line-height: 1.6; white-space: pre-line; max-height: 180px; overflow-y: auto;">
            ${instructions}
          </p>
        </div>
      </div>

      <!-- SELETTORE QUANTITÀ & TASTO AGGIUNGI (DISABILITATO SE SENZA RISTORANTE) -->
      <div class="border-top pt-4 mt-auto">
        ${hasRestaurant ? `
          <div class="d-flex align-items-center gap-3 mb-3">
            <span class="small fw-bold text-uppercase">${t.qtyLabel}:</span>
            <div class="d-flex align-items-center border border-dark">
              <button type="button" class="btn btn-sm border-0 rounded-0 px-3 fw-bold" onclick="changeQuantity(-1)">-</button>
              <span class="px-3 fw-bold small" id="qty-val">${quantity}</span>
              <button type="button" class="btn btn-sm border-0 rounded-0 px-3 fw-bold" onclick="changeQuantity(1)">+</button>
            </div>
          </div>

          <button type="button" class="btn btn-dark rounded-0 w-100 py-3 fw-bold text-uppercase" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.05em;" onclick="addCurrentMealToCart()">
            <i class="bi bi-bag-plus me-2"></i> ${t.btnAddCart} &bull; € <span id="total-price-btn">${((meal.price || 0) * quantity).toFixed(2)}</span>
          </button>
        ` : `
          <button type="button" class="btn btn-secondary rounded-0 w-100 py-3 fw-bold text-uppercase" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.05em; cursor: not-allowed;" disabled>
            <i class="bi bi-slash-circle me-2"></i> ${t.btnUnavailable}
          </button>
        `}
      </div>

    </div>
  `;
}

function changeQuantity(delta) {
  quantity += delta;
  if (quantity < 1) quantity = 1;

  const qtyEl = document.getElementById('qty-val');
  if (qtyEl) qtyEl.textContent = quantity;

  const totalBtn = document.getElementById('total-price-btn');
  if (totalBtn && currentMeal) {
    totalBtn.textContent = ((currentMeal.price || 0) * quantity).toFixed(2);
  }
}

function addCurrentMealToCart() {
  if (!currentMeal || !currentMeal.restaurant || !currentMeal.restaurant._id) return;

  const restId = currentMeal.restaurant._id;
  const restName = currentMeal.restaurant.name;

  const item = cart.find(i => i.mealId === (currentMeal._id || currentMeal.idMeal));
  if (item) {
    item.quantity += quantity;
  } else {
    cart.push({
      mealId: currentMeal._id || currentMeal.idMeal,
      name: currentMeal.strMeal || 'Piatto',
      price: currentMeal.price || 0,
      quantity: quantity,
      restaurantId: restId,
      restaurantName: restName
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartBadge();

  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.classList.add('bg-warning', 'text-dark');
    setTimeout(() => badge.classList.remove('bg-warning', 'text-dark'), 300);
  }

  const t = i18n[currentLang];
  const btn = document.querySelector('button[onclick="addCurrentMealToCart()"]');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="bi bi-check2 me-2"></i> ${t.addedSuccess}`;
    btn.classList.replace('btn-dark', 'btn-success');
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.replace('btn-success', 'btn-dark');
    }, 1200);
  }
}

function renderCartBadge() {
  const count = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;
}

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
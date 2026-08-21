// public/js/manageMenu.js

let myMeals = [];
let globalCatalogMeals = [];
let userProfile = null;

let mySearchTerm = '';
let myActiveCategory = 'ALL';
let catalogSearchTerm = '';

let currentLang = localStorage.getItem('appLang') || 'IT';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Pannello Esercente • Gestione Listino, Ricette e Piatti al Banco',
    badgeActive: 'PARTNER ESERCENTE',
    btnDeleteAll: 'SVUOTA LISTINO',
    btnCreateCustom: '+ CREA NUOVO PIATTO',
    btnStats: 'STATISTICHE',
    tabMyMenu: 'IL MIO LISTINO ATTIVO',
    tabImport: 'AGGIUNGI DA CATALOGO GENERALE',
    searchMyPlaceholder: 'Cerca tra i tuoi piatti...',
    searchCatalogPlaceholder: 'Cerca piatto globale da importare...',
    noMyMeals: 'Nessun piatto attivo nel tuo menu. Clicca su "+ CREA NUOVO PIATTO" o importa dal catalogo!',
    noCatalogMeals: 'Nessun piatto trovato nel catalogo con i filtri inseriti.',
    btnDelete: 'ELIMINA',
    btnAdd: '+ AGGIUNGI AL MIO MENU',
    btnAlreadyInMenu: 'GIÀ NEL TUO MENU',
    prep: 'prep',
    dManageMenu: 'GESTIONE MENU',
    dStats: 'STATISTICHE LOCALE',
    dRestaurants: 'I NOSTRI RISTORANTI',
    dCatalog: 'CATALOGO COMPLETO',
    fService: 'SERVIZIO',
    fPartner: 'PARTNER',
    fSupport: 'SUPPORTO',
    fLegal: 'LEGAL',
    confirmDeleteSingle: 'Sei sicuro di voler eliminare questo piatto dal tuo listino?',
    confirmDeleteAll: 'ATTENZIONE: Stai per eliminare TUTTI i piatti dal menu del tuo ristorante. Confermi?'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: 'Merchant Dashboard • Manage Menu Items, Recipes and Prices',
    badgeActive: 'PARTNER MERCHANT',
    btnDeleteAll: 'CLEAR ALL MENU',
    btnCreateCustom: '+ CREATE NEW DISH',
    btnStats: 'STATISTICS',
    tabMyMenu: 'MY ACTIVE MENU',
    tabImport: 'IMPORT FROM CATALOG',
    searchMyPlaceholder: 'Search your dishes...',
    searchCatalogPlaceholder: 'Search global dishes to import...',
    noMyMeals: 'No active dishes in your menu. Click "+ CREATE NEW DISH" or import from the catalog!',
    noCatalogMeals: 'No catalog dishes found matching your search.',
    btnDelete: 'DELETE',
    btnAdd: '+ ADD TO MY MENU',
    btnAlreadyInMenu: 'ALREADY IN MENU',
    prep: 'prep',
    dManageMenu: 'MANAGE MENU',
    dStats: 'RESTAURANT STATS',
    dRestaurants: 'OUR RESTAURANTS',
    dCatalog: 'FULL CATALOG',
    fService: 'SERVICE',
    fPartner: 'PARTNER',
    fSupport: 'SUPPORT',
    fLegal: 'LEGAL',
    confirmDeleteSingle: 'Are you sure you want to delete this dish from your menu?',
    confirmDeleteAll: 'WARNING: You are about to DELETE ALL dishes from your restaurant menu. Are you sure?'
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token || role !== 'restaurant') {
    alert('Accesso riservato ai ristoranti partner.');
    window.location.href = 'login.html';
    return;
  }

  renderLanguageUI();
  renderDrawerAuth();
  await loadRestaurantProfileAndAllMeals();
});

function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
  renderMyMeals();
  renderGlobalCatalog();
}

function renderLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('lang-btn', t.btn);
  setT('txt-announcement', t.announcement);
  setT('txt-badge-active', t.badgeActive);
  setT('txt-btn-delete-all', t.btnDeleteAll);
  setT('txt-btn-create-custom', t.btnCreateCustom);
  setT('txt-btn-stats', t.btnStats);
  setT('txt-tab-my-menu', t.tabMyMenu);
  setT('txt-tab-import', t.tabImport);

  const searchMy = document.getElementById('search-my-meals');
  if (searchMy) searchMy.placeholder = t.searchMyPlaceholder;

  const searchCat = document.getElementById('search-catalog-meals');
  if (searchCat) searchCat.placeholder = t.searchCatalogPlaceholder;

  setT('txt-d-managemenu', t.dManageMenu);
  setT('txt-d-stats', t.dStats);
  setT('txt-d-restaurants', t.dRestaurants);
  setT('txt-d-catalog', t.dCatalog);
  setT('txt-f-service', t.fService);
  setT('txt-f-partner', t.fPartner);
  setT('txt-f-support', t.fSupport);
  setT('txt-f-legal', t.fLegal);
}

/**
 * Caricamento dati usando /api/restaurants/:id/menu
 */
async function loadRestaurantProfileAndAllMeals() {
  try {
    // 1. Profilo del locale
    userProfile = await apiRequest('/auth/me');
    const myId = String(userProfile._id || userProfile.id);

    const restName = userProfile.restaurantName || userProfile.name || 'Il Tuo Locale';
    const restAddr = userProfile.restaurantAddress || userProfile.address || 'Ritiro al bancone';

    const titleEl = document.getElementById('restaurant-name-header');
    const addrEl = document.getElementById('restaurant-addr-header');
    if (titleEl) titleEl.textContent = restName;
    if (addrEl) addrEl.textContent = `${restAddr} • P.IVA: ${userProfile.partitaIva || 'Attiva'}`;

    // 2. Recupera il menu esclusivo di questo ristorante
    const myMenuRes = await apiRequest(`/restaurants/${myId}/menu`);
    myMeals = (myMenuRes && Array.isArray(myMenuRes.menu)) ? myMenuRes.menu.filter(m => m !== null) : [];

    // 3. Recupera il catalogo globale completo
    const allRes = await apiRequest('/meals');
    globalCatalogMeals = Array.isArray(allRes) ? allRes : (allRes.meals || []);

    updateMyMealsCount();
    buildMyCategoriesBar();
    renderMyMeals();
    renderGlobalCatalog();

  } catch (err) {
    console.error('Errore caricamento dati menu:', err);
  }
}

function updateMyMealsCount() {
  const countEl = document.getElementById('my-meals-count');
  if (countEl) countEl.textContent = myMeals.length;
}

function buildMyCategoriesBar() {
  const bar = document.getElementById('my-categories-bar');
  if (!bar) return;

  const categories = ['ALL', ...new Set(myMeals.map(m => m.strCategory || 'General'))];

  bar.innerHTML = categories.map(cat => `
    <button type="button" class="btn btn-sm ${myActiveCategory === cat ? 'btn-dark' : 'btn-outline-dark'} rounded-0 text-uppercase px-2 py-1" onclick="filterMyCategory('${cat}')" style="font-size: 0.75rem;">
      ${cat}
    </button>
  `).join('');
}

function filterMyCategory(cat) {
  myActiveCategory = cat;
  buildMyCategoriesBar();
  renderMyMeals();
}

/**
 * 1. I MIEI PIATTI ATTIVI
 */
function renderMyMeals() {
  const grid = document.getElementById('my-meals-grid');
  if (!grid) return;

  const t = i18n[currentLang];
  let list = [...myMeals];

  if (myActiveCategory !== 'ALL') {
    list = list.filter(m => (m.strCategory || '').toLowerCase() === myActiveCategory.toLowerCase());
  }

  if (mySearchTerm) {
    const term = mySearchTerm.toLowerCase();
    list = list.filter(m => 
      (m.strMeal && m.strMeal.toLowerCase().includes(term)) ||
      (m.description && m.description.toLowerCase().includes(term)) ||
      (m.strInstructions && m.strInstructions.toLowerCase().includes(term))
    );
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${t.noMyMeals}</div>`;
    return;
  }

  grid.innerHTML = list.map(m => {
    const thumb = m.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    const price = (m.price || 0).toFixed(2);
    const cat = m.strCategory || 'PIATTO';
    const prepTime = m.preparationTime || 15;
    const desc = m.description || m.strInstructions || 'Nessuna descrizione specificata.';
    const ingrList = Array.isArray(m.ingredients) ? m.ingredients.join(', ') : (m.ingredients || '');

    return `
      <div class="col-12 col-md-6 col-lg-4 col-xl-3">
        <div class="border border-dark bg-white h-100 d-flex flex-column justify-content-between p-3 position-relative">
          <div>
            <div class="position-relative mb-2">
              <img src="${thumb}" alt="${m.strMeal}" class="w-100" style="aspect-ratio: 4/3; object-fit: cover;" loading="lazy">
              <span class="badge bg-black text-white position-absolute top-0 start-0 m-2 rounded-0 small">${cat}</span>
              <span class="badge bg-light text-dark border border-dark position-absolute top-0 end-0 m-2 rounded-0 small">
                <i class="bi bi-clock"></i> ${prepTime}m ${t.prep}
              </span>
            </div>

            <div class="fw-bold text-uppercase text-truncate mb-1" style="font-family: 'Space Grotesk', sans-serif;">
              ${m.strMeal}
            </div>

            <div class="fw-bold font-monospace mb-2" style="font-size: 1.1rem;">
              € ${price}
            </div>

            <p class="small text-muted mb-2 text-truncate" style="font-size: 0.8rem;" title="${desc}">
              ${desc}
            </p>

            ${ingrList ? `
              <div class="small text-dark mb-3 p-2 bg-light border" style="font-size: 0.75rem; line-height: 1.2;">
                <strong>Ingredienti:</strong> ${ingrList}
              </div>
            ` : ''}
          </div>

          <div class="border-top pt-2 mt-auto">
            <button type="button" class="btn btn-outline-danger btn-sm rounded-0 w-100 fw-bold text-uppercase py-1" onclick="handleDeleteSingleMeal('${m._id}')">
              <i class="bi bi-trash3 me-1"></i> ${t.btnDelete}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleSearchMyMeals(e) {
  mySearchTerm = e.target.value.trim();
  renderMyMeals();
}

/**
 * 2. CATALOGO GLOBALE
 */
function renderGlobalCatalog() {
  const grid = document.getElementById('global-catalog-grid');
  if (!grid) return;

  const t = i18n[currentLang];
  let list = [...globalCatalogMeals];

  if (catalogSearchTerm) {
    const term = catalogSearchTerm.toLowerCase();
    list = list.filter(m => 
      (m.strMeal && m.strMeal.toLowerCase().includes(term)) ||
      (m.strCategory && m.strCategory.toLowerCase().includes(term))
    );
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${t.noCatalogMeals}</div>`;
    return;
  }

  // Controlla per ID o per Nome se è già a menu
  const myMealIds = new Set(myMeals.map(m => String(m._id)));
  const myMealNames = new Set(myMeals.map(m => (m.strMeal || '').trim().toLowerCase()));

  grid.innerHTML = list.map(m => {
    const isAlreadyIn = myMealIds.has(String(m._id)) || myMealNames.has((m.strMeal || '').trim().toLowerCase());
    const thumb = m.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
    const price = (m.price || 0).toFixed(2);
    const cat = m.strCategory || 'PIATTO';
    const prepTime = m.preparationTime || 15;

    return `
      <div class="col-12 col-md-6 col-lg-4 col-xl-3">
        <div class="border border-dark bg-white h-100 d-flex flex-column justify-content-between p-3">
          <div>
            <div class="position-relative mb-2">
              <img src="${thumb}" alt="${m.strMeal}" class="w-100" style="aspect-ratio: 4/3; object-fit: cover;" loading="lazy">
              <span class="badge bg-black text-white position-absolute top-0 start-0 m-2 rounded-0 small">${cat}</span>
              <span class="badge bg-light text-dark border border-dark position-absolute top-0 end-0 m-2 rounded-0 small">
                <i class="bi bi-clock"></i> ${prepTime}m ${t.prep}
              </span>
            </div>

            <div class="fw-bold text-uppercase text-truncate mb-1" style="font-family: 'Space Grotesk', sans-serif;">
              ${m.strMeal}
            </div>

            <div class="fw-bold font-monospace mb-2">
              € ${price}
            </div>
          </div>

          <div class="border-top pt-2 mt-2">
            ${isAlreadyIn ? `
              <button class="btn btn-outline-success btn-sm rounded-0 w-100 fw-bold small" disabled>
                <i class="bi bi-check2-circle me-1"></i> ${t.btnAlreadyInMenu}
              </button>
            ` : `
              <button type="button" class="btn btn-dark btn-sm rounded-0 w-100 fw-bold text-uppercase py-1" onclick="handleImportMeal('${m._id}')">
                <i class="bi bi-plus-lg me-1"></i> ${t.btnAdd}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleSearchCatalogMeals(e) {
  catalogSearchTerm = e.target.value.trim();
  renderGlobalCatalog();
}

/**
 * 3. AGGIUNGI DA CATALOGO GENERALE -> POST /api/restaurants/menu/add-existing
 */
async function handleImportMeal(mealId) {
  try {
    await apiRequest('/restaurants/menu/add-existing', 'POST', { mealId });
    await loadRestaurantProfileAndAllMeals();
  } catch (err) {
    console.error('Errore importazione piatto:', err);
    alert('Errore: ' + (err.message || 'Non è stato possibile aggiungere il piatto.'));
  }
}

/**
 * 4. CREA PIATTO PERSONALIZZATO -> POST /api/restaurants/menu/create-custom
 */
async function handleCreateCustomMeal(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-custom');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvataggio...`;

  const strMeal = document.getElementById('custom-meal-name').value.trim();
  const price = parseFloat(document.getElementById('custom-meal-price').value);
  const strCategory = document.getElementById('custom-meal-category').value;
  const preparationTime = parseInt(document.getElementById('custom-meal-time').value) || 15;
  const strMealThumb = document.getElementById('custom-meal-thumb').value.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  
  const description = document.getElementById('custom-meal-desc').value.trim();
  const rawIngredients = document.getElementById('custom-meal-ingredients').value.trim();
  const instructions = document.getElementById('custom-meal-instructions').value.trim();

  const ingredientsArray = rawIngredients ? rawIngredients.split(',').map(i => i.trim()).filter(i => i.length > 0) : [];

  const payload = {
    strMeal,
    price,
    strCategory,
    preparationTime,
    strMealThumb,
    description,
    strInstructions: instructions || description,
    ingredients: ingredientsArray
  };

  try {
    await apiRequest('/restaurants/menu/create-custom', 'POST', payload);

    const modalEl = document.getElementById('modalCreateMeal');
    const modalInst = bootstrap.Modal.getInstance(modalEl);
    if (modalInst) modalInst.hide();
    document.getElementById('form-create-meal').reset();

    await loadRestaurantProfileAndAllMeals();
  } catch (err) {
    console.error('Errore creazione piatto:', err);
    alert('Errore durante la creazione: ' + (err.message || 'Controlla i dati inseriti'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = `SALVA E AGGIUNGI AL LISTINO &rarr;`;
  }
}

/**
 * 5. ELIMINA SINGOLO PIATTO -> DELETE /api/restaurants/menu/:mealId
 */
async function handleDeleteSingleMeal(mealId) {
  const t = i18n[currentLang];
  if (!confirm(t.confirmDeleteSingle)) return;

  try {
    await apiRequest(`/restaurants/menu/${mealId}`, 'DELETE');
    await loadRestaurantProfileAndAllMeals();
  } catch (err) {
    console.error('Errore eliminazione piatto:', err);
    alert('Errore eliminazione: ' + (err.message || 'Errore server'));
  }
}

/**
 * 6. SVUOTA TUTTO IL LISTINO
 */
async function handleDeleteAllMyMeals() {
  const t = i18n[currentLang];
  if (myMeals.length === 0) {
    alert('Il tuo listino è già vuoto.');
    return;
  }

  if (!confirm(t.confirmDeleteAll)) return;

  const toDelete = [...myMeals];
  for (const m of toDelete) {
    try {
      await apiRequest(`/restaurants/menu/${m._id}`, 'DELETE');
    } catch (err) {
      console.error(`Errore eliminazione ${m._id}:`, err);
    }
  }

  await loadRestaurantProfileAndAllMeals();
}

function renderDrawerAuth() {
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Ristoratore';
  const drawerSec = document.getElementById('drawer-user-section');
  if (!drawerSec) return;

  const isIt = currentLang === 'IT';

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
}
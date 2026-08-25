// public/js/manageMenu.js

let myMeals = [];
let filteredMyMeals = [];
let allGlobalMeals = [];
let filteredGlobalMeals = [];
let activeMyCategory = '';
let myRestaurantId = '';

const FALLBACK_DISH_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

// Inizializzazione coordinata al caricamento componenti di utils.js
document.addEventListener('componentsLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  // Controllo di accesso per ristoratori
  if (!token || role !== 'restaurant') {
    window.location.href = 'login.html';
    return;
  }

  await loadRestaurantProfileAndMenu();
});

window.updateView = function() {
  renderMyMeals();
  renderGlobalCatalog();
};

/**
 * 1. Recupero Dati Profilo Ristorante e Listino Attivo
 */
async function loadRestaurantProfileAndMenu() {
  try {
    const profileRes = await apiRequest('/auth/me').catch(() => apiRequest('/users/me'));
    const user = profileRes.user || profileRes;
    
    myRestaurantId = user._id || user.id;

    const nameEl = document.getElementById('restaurant-name-header');
    const addrEl = document.getElementById('restaurant-addr-header');
    if (nameEl) nameEl.textContent = user.restaurantName || user.name || 'GESTIONALE LOCALE';
    if (addrEl) addrEl.textContent = user.restaurantAddress || 'Sede Principale';

    // Recupera sia i piatti del proprio menu sia il catalogo generale
    const [menuRes, allMealsRes] = await Promise.allSettled([
      apiRequest(`/restaurants/${myRestaurantId}/menu`),
      apiRequest('/meals')
    ]);

    if (menuRes.status === 'fulfilled' && menuRes.value) {
      myMeals = Array.isArray(menuRes.value.menu) ? menuRes.value.menu : [];
    } else {
      myMeals = [];
    }

    const rawGlobal = allMealsRes.status === 'fulfilled' 
      ? (Array.isArray(allMealsRes.value) ? allMealsRes.value : (allMealsRes.value.meals || []))
      : [];

    // Deduplica catalogo globale
    const map = new Map();
    rawGlobal.forEach(m => {
      const k = String(m._id || m.id);
      if (!map.has(k)) map.set(k, m);
    });
    allGlobalMeals = Array.from(map.values());

    filteredMyMeals = [...myMeals];
    filteredGlobalMeals = [...allGlobalMeals];

    renderMyCategoriesBar();
    renderMyMeals();
    renderGlobalCatalog();

  } catch (err) {
    console.error('Errore caricamento menu del locale:', err);
  }
}

/**
 * 2. Categorie filtro nel proprio menu
 */
function renderMyCategoriesBar() {
  const bar = document.getElementById('my-categories-bar');
  if (!bar) return;

  const isIt = currentLang === 'IT';
  const cats = [...new Set(myMeals.map(m => m.strCategory).filter(Boolean))];

  bar.innerHTML = `
    <button type="button" class="btn btn-sm ${activeMyCategory === '' ? 'btn-dark' : 'btn-outline-dark'} rounded-0 fw-bold text-uppercase px-2 py-1" onclick="filterMyCategory('')">
      ${isIt ? 'TUTTI' : 'ALL'}
    </button>
    ${cats.map(c => `
      <button type="button" class="btn btn-sm ${activeMyCategory.toLowerCase() === c.toLowerCase() ? 'btn-dark' : 'btn-outline-dark'} rounded-0 fw-bold text-uppercase px-2 py-1" onclick="filterMyCategory('${c.replace(/'/g, "\\'")}')">
        ${c}
      </button>
    `).join('')}
  `;
}

window.filterMyCategory = function(cat) {
  activeMyCategory = cat;
  if (!cat) {
    filteredMyMeals = [...myMeals];
  } else {
    filteredMyMeals = myMeals.filter(m => (m.strCategory || '').toLowerCase() === cat.toLowerCase());
  }
  renderMyCategoriesBar();
  renderMyMeals();
};

/**
 * 3. Render Tab 1: I Miei Piatti Attivi
 */
function renderMyMeals() {
  const grid = document.getElementById('my-meals-grid');
  const countEl = document.getElementById('my-meals-count');
  const isIt = currentLang === 'IT';

  if (countEl) countEl.textContent = myMeals.length;
  if (!grid) return;

  if (filteredMyMeals.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5 border border-dark bg-white">
        <i class="bi bi-journal-x fs-1 text-muted d-block mb-2"></i>
        <h6 class="fw-bold text-uppercase">${isIt ? 'Nessun piatto presente nel tuo listino' : 'No meals in your menu yet'}</h6>
        <p class="small text-muted mb-3">${isIt ? 'Aggiungi piatti dal catalogo generale o crea la tua prima ricetta personalizzata.' : 'Add meals from global catalog or create a custom recipe.'}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredMyMeals.map(meal => {
    const mId = meal._id || meal.id;
    const price = (Number(meal.price) || 8.50).toFixed(2);
    const thumb = meal.strMealThumb || FALLBACK_DISH_IMG;
    const isCustom = meal.restaurantId && String(meal.restaurantId) === String(myRestaurantId);

    return `
      <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
        <div class="card h-100 rounded-0 border-dark bg-white shadow-none d-flex flex-column justify-content-between">
          <div>
            <div class="position-relative overflow-hidden border-bottom border-dark" style="height: 180px;">
              <img src="${thumb}" alt="${meal.strMeal}" class="w-100 h-100" style="object-fit: cover;">
              <span class="badge bg-black text-white rounded-0 text-uppercase position-absolute top-0 start-0 m-2" style="font-size: 0.65rem;">
                ${meal.strCategory || 'PIATTO'}
              </span>
              ${isCustom ? `<span class="badge bg-primary rounded-0 text-uppercase position-absolute top-0 end-0 m-2" style="font-size: 0.65rem;">TUA RICETTA</span>` : ''}
            </div>

            <div class="p-3">
              <div class="d-flex justify-content-between align-items-baseline mb-1">
                <span class="font-monospace fw-bold text-dark fs-6">€ ${price}</span>
                <span class="small text-muted font-monospace">${meal.preparationTime || 15}m prep</span>
              </div>
              <h6 class="fw-bold text-uppercase text-truncate mb-2" title="${meal.strMeal}">
                ${meal.strMeal}
              </h6>
            </div>
          </div>

          <div class="border-top border-dark">
            <button type="button" class="btn btn-outline-danger btn-sm rounded-0 w-100 fw-bold text-uppercase py-2 border-0" onclick="handleRemoveMealFromMenu('${mId}')">
              <i class="bi bi-trash3 me-1"></i> ${isIt ? 'RIMUOVI DAL LISTINO' : 'REMOVE FROM MENU'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 4. Render Tab 2: Catalogo Generale da Importare
 */
function renderGlobalCatalog() {
  const grid = document.getElementById('global-catalog-grid');
  const isIt = currentLang === 'IT';
  if (!grid) return;

  const myMealIds = new Set(myMeals.map(m => String(m._id || m.id)));

  grid.innerHTML = filteredGlobalMeals.map(meal => {
    const mId = String(meal._id || meal.id);
    const alreadyInMenu = myMealIds.has(mId);
    const price = (Number(meal.price) || 8.50).toFixed(2);
    const thumb = meal.strMealThumb || FALLBACK_DISH_IMG;

    return `
      <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
        <div class="card h-100 rounded-0 border-dark bg-white shadow-none d-flex flex-column justify-content-between">
          <div>
            <div class="position-relative overflow-hidden border-bottom border-dark" style="height: 170px;">
              <img src="${thumb}" alt="${meal.strMeal}" class="w-100 h-100" style="object-fit: cover;">
              <span class="badge bg-black text-white rounded-0 text-uppercase position-absolute top-0 start-0 m-2" style="font-size: 0.65rem;">
                ${meal.strCategory || 'CATALOGO'}
              </span>
            </div>

            <div class="p-3">
              <div class="d-flex justify-content-between align-items-baseline mb-1">
                <span class="font-monospace fw-bold text-dark fs-6">€ ${price}</span>
                <span class="small text-muted font-monospace">${meal.preparationTime || 15}m prep</span>
              </div>
              <h6 class="fw-bold text-uppercase text-truncate mb-0" title="${meal.strMeal}">
                ${meal.strMeal}
              </h6>
            </div>
          </div>

          <div class="border-top border-dark">
            ${alreadyInMenu ? `
              <button type="button" class="btn btn-light text-muted btn-sm rounded-0 w-100 fw-bold text-uppercase py-2 border-0 disabled">
                <i class="bi bi-check2-circle me-1"></i> ${isIt ? 'GIÀ A LISTINO' : 'IN MENU'}
              </button>
            ` : `
              <button type="button" class="btn btn-dark btn-sm rounded-0 w-100 fw-bold text-uppercase py-2 border-0" onclick="handleAddExistingMeal('${mId}')">
                <i class="bi bi-plus-lg me-1"></i> ${isIt ? 'AGGIUNGI AL MIO MENU' : 'ADD TO MY MENU'}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 5. Azioni Operative (Add Existing, Create Custom, Remove)
 */
window.handleAddExistingMeal = async function(mealId) {
  try {
    const res = await apiRequest('/restaurants/menu/add-existing', {
      method: 'POST',
      body: JSON.stringify({ mealId })
    });

    if (res) {
      await loadRestaurantProfileAndMenu();
    }
  } catch (err) {
    alert('Errore aggiunta piatto: ' + err.message);
  }
};

window.handleRemoveMealFromMenu = async function(mealId) {
  const isIt = currentLang === 'IT';
  if (!confirm(isIt ? 'Vuoi rimuovere questo piatto dal tuo menu?' : 'Remove this dish from your menu?')) return;

  try {
    const res = await apiRequest(`/restaurants/menu/${mealId}`, {
      method: 'DELETE'
    });

    if (res) {
      await loadRestaurantProfileAndMenu();
    }
  } catch (err) {
    alert('Errore rimozione piatto: ' + err.message);
  }
};

window.handleCreateCustomMeal = async function(e) {
  e.preventDefault();

  const name = document.getElementById('custom-meal-name').value.trim();
  const price = parseFloat(document.getElementById('custom-meal-price').value);
  const category = document.getElementById('custom-meal-category').value;
  const time = parseInt(document.getElementById('custom-meal-time').value, 10) || 15;
  const thumb = document.getElementById('custom-meal-thumb').value.trim();
  const desc = document.getElementById('custom-meal-desc').value.trim();
  const rawIngr = document.getElementById('custom-meal-ingredients').value.trim();

  const ingredients = rawIngr ? rawIngr.split(',').map(s => s.trim()).filter(Boolean) : [];

  const payload = {
    strMeal: name,
    price: price,
    strCategory: category,
    preparationTime: time,
    strMealThumb: thumb || FALLBACK_DISH_IMG,
    description: desc,
    ingredients: ingredients
  };

  try {
    const submitBtn = document.getElementById('btn-submit-custom');
    if (submitBtn) submitBtn.disabled = true;

    const res = await apiRequest('/restaurants/menu/create-custom', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res) {
      const modalEl = document.getElementById('modalCreateMeal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('form-create-meal').reset();
      await loadRestaurantProfileAndMenu();
    }
  } catch (err) {
    alert('Errore creazione piatto: ' + err.message);
  } finally {
    const submitBtn = document.getElementById('btn-submit-custom');
    if (submitBtn) submitBtn.disabled = false;
  }
};

window.handleDeleteAllMyMeals = async function() {
  const isIt = currentLang === 'IT';
  if (myMeals.length === 0) return;

  if (!confirm(isIt ? 'ATTENZIONE: Sei sicuro di voler svuotare tutto il tuo listino?' : 'WARNING: Are you sure you want to clear your entire menu?')) return;

  try {
    for (const meal of myMeals) {
      const mId = meal._id || meal.id;
      await apiRequest(`/restaurants/menu/${mId}`, { method: 'DELETE' });
    }
    await loadRestaurantProfileAndMenu();
  } catch (err) {
    alert('Errore durante lo svuotamento: ' + err.message);
  }
};

window.handleSearchMyMeals = function(e) {
  const q = e.target.value.toLowerCase().trim();
  filteredMyMeals = myMeals.filter(m => {
    const name = (m.strMeal || '').toLowerCase();
    const cat = (m.strCategory || '').toLowerCase();
    return name.includes(q) || cat.includes(q);
  });
  renderMyMeals();
};

window.handleSearchCatalogMeals = function(e) {
  const q = e.target.value.toLowerCase().trim();
  filteredGlobalMeals = allGlobalMeals.filter(m => {
    const name = (m.strMeal || '').toLowerCase();
    const cat = (m.strCategory || '').toLowerCase();
    return name.includes(q) || cat.includes(q);
  });
  renderGlobalCatalog();
};
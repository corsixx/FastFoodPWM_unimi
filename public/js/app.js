// public/js/app.js

let allMeals = [];
let userFavoriteCategory = '';
let selectedMealForCart = null;

// Avvio dopo il caricamento componenti da utils.js
document.addEventListener('componentsLoaded', async () => {
  await loadUserProfilePreference();
  await loadCategories();
  await loadHomeMeals();
  if (typeof setupBarMovement === 'function') setupBarMovement();
});

window.updateView = function() {
  updateSectionHeaders();
  renderMealsGrid();
};

/**
 * 1. Recupera la preferenza del cliente
 */
async function loadUserProfilePreference() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token || role !== 'customer') {
    userFavoriteCategory = '';
    return;
  }

  try {
    const profile = await apiRequest('/auth/me').catch(() => apiRequest('/users/me'));
    const user = profile.user || profile;
    if (user && user.favoriteCategory && user.favoriteCategory.trim() !== '') {
      userFavoriteCategory = user.favoriteCategory.trim();
    }
  } catch (err) {
    userFavoriteCategory = '';
  }
}

/**
 * 2. Caricamento categorie e reindirizzamento al catalogo
 */
async function loadCategories() {
  try {
    const categories = await apiRequest('/meals/categories');
    const container = document.getElementById('categories-nav');
    if (!container || !Array.isArray(categories)) return;

    const allLabel = currentLang === 'IT' ? 'ALL / TUTTO' : 'ALL / FULL';
    container.innerHTML = `
      <button type="button" class="nav-category-link active" onclick="goToCatalogCategory('')" id="btn-cat-all">
        ${allLabel}
      </button>
      ${categories.map(cat => `
        <button type="button" class="nav-category-link" onclick="goToCatalogCategory('${cat.replace(/'/g, "\\'")}')">
          ${cat.toUpperCase()}
        </button>
      `).join('')}
    `;
  } catch (err) {
    console.error('Errore caricamento categorie:', err);
  }
}

window.goToCatalogCategory = function(cat) {
  if (!cat || cat.trim() === '') {
    window.location.href = 'catalog.html';
  } else {
    window.location.href = `catalog.html?category=${encodeURIComponent(cat.trim())}`;
  }
};

window.filterCategory = function(cat) {
  window.goToCatalogCategory(cat);
};

/**
 * 3. Caricamento piatti: Nuove Aggiunte (New In)
 */
async function loadHomeMeals() {
  try {
    const mealsData = await apiRequest('/meals');
    const rawList = Array.isArray(mealsData) ? mealsData : (mealsData.meals || []);

    // Deduplicazione per ID
    const uniqueMap = new Map();
    rawList.forEach(m => {
      const key = String(m._id || m.id);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, m);
      }
    });

    const uniqueList = Array.from(uniqueMap.values());

    // Ordine NEW IN: i piatti aggiunti più di recente in cima
    allMeals = uniqueList.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return String(b._id || b.id).localeCompare(String(a._id || a.id));
    });

    updateSectionHeaders();
    renderMealsGrid();
  } catch (err) {
    console.error('Errore caricamento piatti home:', err);
    document.getElementById('meals-grid').innerHTML = `
      <div class="col-12 text-center py-5 text-danger">Impossibile caricare i piatti dal server.</div>
    `;
  }
}

/**
 * 4. Intestazioni dinamiche: Preferenze per cliente loggato, NEW IN per tutti gli altri
 */
function updateSectionHeaders() {
  const badgeEl = document.getElementById('home-section-badge');
  const titleEl = document.getElementById('txt-popular-title');
  const subLabel = document.getElementById('user-pref-label');
  const role = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');
  const isIt = currentLang === 'IT';

  if (!titleEl) return;

  // CASO 1: Cliente loggato con preferenza impostata
  if (token && role === 'customer' && userFavoriteCategory) {
    if (badgeEl) badgeEl.textContent = isIt ? 'SCELTI PER TE' : 'RECOMMENDED FOR YOU';
    titleEl.textContent = `${isIt ? 'PIATTI A BASE DI' : 'DISHES WITH'} ${userFavoriteCategory.toUpperCase()}`;
    if (subLabel) subLabel.textContent = isIt ? `In base alla tua preferenza: ${userFavoriteCategory}` : `Based on your preference: ${userFavoriteCategory}`;
    return;
  }

  // CASO 2: Utente non loggato, Ristoratore o Cliente senza preferenza -> NEW IN
  if (badgeEl) badgeEl.textContent = isIt ? 'NUOVE AGGIUNTE' : 'JUST ADDED';
  titleEl.textContent = isIt ? 'NEW IN / GLI ULTIMI ARRIVI' : 'NEW IN / LATEST ARRIVALS';
  if (subLabel) subLabel.textContent = isIt ? 'Le ultime ricette e specialità inserite nel menu' : 'Latest recipes and specialties added to the menu';
}

/**
 * 5. Rendering della griglia piatti
 */
window.renderMealsGrid = function() {
  const grid = document.getElementById('meals-grid');
  if (!grid) return;

  const role = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');
  const isRestaurant = role === 'restaurant';
  const isIt = currentLang === 'IT';
  let list = [...allMeals];

  // Se cliente loggato con preferenza, filtra solo i piatti della sua categoria
  if (token && role === 'customer' && userFavoriteCategory) {
    const prefList = list.filter(m => (m.strCategory || '').toLowerCase() === userFavoriteCategory.toLowerCase());
    list = prefList.length > 0 ? prefList : list;
  }

  // De-duplicazione finale prima del taglio a 16
  const finalUnique = [];
  const seen = new Set();
  for (const m of list) {
    const key = String(m._id || m.id);
    if (!seen.has(key)) {
      seen.add(key);
      finalUnique.push(m);
    }
  }

  const pageItems = finalUnique.slice(0, 16);

  if (pageItems.length === 0) {
    const noMealsMsg = isIt ? 'Nessun piatto trovato per questa selezione.' : 'No meals found for this selection.';
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${noMealsMsg}</div>`;
    return;
  }

  grid.innerHTML = pageItems.map(m => {
    const hasRest = Array.isArray(m.availableRestaurants) && m.availableRestaurants.length > 0;
    const thumbUrl = m.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    const price = (Number(m.price) || 8.50).toFixed(2);
    const prepTime = m.preparationTime || 15;

    const canAddToCart = !isRestaurant && hasRest;

    const cartBtnHtml = canAddToCart
      ? `
        <button type="button" class="btn-card-action btn-card-cart" onclick="promptRestaurantSelection('${m._id}')">
          <i class="bi bi-bag-plus"></i> ${isIt ? '+ CARRELLO' : '+ ADD'}
        </button>
      `
      : `
        <button type="button" class="btn-card-action btn-card-cart disabled text-muted" style="cursor: not-allowed; opacity: 0.65;" title="${isRestaurant ? (isIt ? 'Ordini disabilitati per account ristoratore' : 'Ordering disabled for restaurant account') : (isIt ? 'Piatto non disponibile nei ristoranti' : 'Dish currently unavailable')}">
          <i class="bi bi-slash-circle"></i> ${isIt ? 'NON DISP.' : 'UNAVAIL.'}
        </button>
      `;

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card">
          <div class="product-img-wrapper" onclick="goToMealPage('${m._id}')">
            <img src="${thumbUrl}" alt="${m.strMeal || ''}" loading="lazy">
            <span class="product-tag">${m.strCategory || 'MENU'}</span>
          </div>

          <div class="product-info-body">
            <div class="product-title text-truncate" title="${m.strMeal}">${m.strMeal || 'Piatto'}</div>
            <div class="product-price">
              € ${price} 
              <span class="small text-muted fw-normal">&bull; ${prepTime}m prep</span>
            </div>
          </div>

          <div class="card-action-group">
            <button type="button" class="btn-card-action btn-card-view" onclick="goToMealPage('${m._id}')">
              <i class="bi bi-eye"></i> ${isIt ? 'VEDI' : 'VIEW'}
            </button>
            ${cartBtnHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.goToMealPage = function(mealId) {
  window.location.href = `meal.html?id=${encodeURIComponent(mealId)}`;
};

/**
 * 6. Modale di scelta ristorante per il carrello
 */
window.promptRestaurantSelection = function(mealId) {
  const role = localStorage.getItem('userRole');
  if (role === 'restaurant') return;

  const meal = allMeals.find(m => String(m._id) === String(mealId));
  if (!meal) return;

  selectedMealForCart = meal;
  const price = (Number(meal.price) || 8.50).toFixed(2);

  const thumbEl = document.getElementById('modal-meal-thumb');
  const nameEl = document.getElementById('modal-picker-meal-name');
  const priceEl = document.getElementById('modal-picker-meal-price');
  const listEl = document.getElementById('modal-restaurant-list');

  if (thumbEl) thumbEl.src = meal.strMealThumb || '';
  if (nameEl) nameEl.textContent = meal.strMeal;
  if (priceEl) priceEl.textContent = `€ ${price}`;

  const available = Array.isArray(meal.availableRestaurants) ? meal.availableRestaurants : [];

  if (listEl) {
    if (available.length === 0) {
      const msg = currentLang === 'IT' ? 'Nessun ristorante partner ha attualmente questo piatto a menu.' : 'No partner restaurant currently offers this dish.';
      listEl.innerHTML = `<div class="text-muted small p-2">${msg}</div>`;
    } else {
      listEl.innerHTML = available.map(r => `
        <button type="button" class="btn btn-outline-dark rounded-0 text-start p-2 d-flex justify-content-between align-items-center mb-2 w-100" onclick="confirmAddToCartWithRestaurant('${r._id}', '${(r.name || 'Ristorante').replace(/'/g, "\\'")}')">
          <div>
            <div class="fw-bold text-uppercase small">${r.name || 'Ristorante Partner'}</div>
            <div class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-geo-alt me-1"></i>${r.address || 'Ritiro al bancone'}</div>
          </div>
          <span class="badge bg-black rounded-0 font-monospace">RITIRA QUI →</span>
        </button>
      `).join('');
    }
  }

  const modalEl = document.getElementById('modalChooseRestaurant');
  if (modalEl) {
    const modalInst = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInst.show();
  }
};

window.confirmAddToCartWithRestaurant = function(restId, restName) {
  const role = localStorage.getItem('userRole');
  if (role === 'restaurant' || !selectedMealForCart) return;

  const priceNum = Number(selectedMealForCart.price) || 8.50;
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const mId = String(selectedMealForCart._id);

  const existing = cart.find(i => String(i.id) === mId && String(i.restaurantId) === String(restId));

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: mId,
      name: selectedMealForCart.strMeal,
      price: priceNum,
      thumb: selectedMealForCart.strMealThumb || '',
      preparationTime: selectedMealForCart.preparationTime || 15,
      restaurantId: restId,
      restaurantName: restName,
      quantity: 1
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  
  if (typeof renderCartBadge === 'function') renderCartBadge();
  if (typeof renderDrawerCartUI === 'function') renderDrawerCartUI();

  const modalEl = document.getElementById('modalChooseRestaurant');
  if (modalEl) {
    const modalInst = bootstrap.Modal.getInstance(modalEl);
    if (modalInst) modalInst.hide();
  }

  const cartDrawerEl = document.getElementById('cartOffcanvas');
  if (cartDrawerEl) {
    bootstrap.Offcanvas.getOrCreateInstance(cartDrawerEl).show();
  }
};
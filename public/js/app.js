// public/js/app.js

let allMeals = [];
let userFavoriteCategory = '';
let currentCategory = '';
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
 * Recupera la preferenza del cliente
 */
async function loadUserProfilePreference() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token || role !== 'customer') {
    userFavoriteCategory = '';
    return;
  }

  try {
    const profile = await apiRequest('/users/profile');
    if (profile && profile.favoriteCategory && profile.favoriteCategory.trim() !== '') {
      userFavoriteCategory = profile.favoriteCategory.trim();
    }
  } catch (err) {
    userFavoriteCategory = '';
  }
}

/**
 * Caricamento categorie
 */
async function loadCategories() {
  try {
    const categories = await apiRequest('/meals/categories');
    const container = document.getElementById('categories-nav');
    if (!container || !Array.isArray(categories)) return;

    const allLabel = currentLang === 'IT' ? 'ALL / TUTTO' : 'ALL / FULL';
    container.innerHTML = `
      <button class="nav-category-link ${currentCategory === '' ? 'active' : ''}" onclick="filterCategory('', this)" id="btn-cat-all">
        ${allLabel}
      </button>
      ${categories.map(cat => `
        <button class="nav-category-link ${currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" onclick="filterCategory('${cat.replace(/'/g, "\\'")}', this)">
          ${cat.toUpperCase()}
        </button>
      `).join('')}
    `;
  } catch (err) {
    console.error('Errore caricamento categorie:', err);
  }
}

window.filterCategory = function(cat, btnEl) {
  currentCategory = cat;
  const allBtns = document.querySelectorAll('#categories-nav .nav-category-link');
  allBtns.forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  updateSectionHeaders();
  renderMealsGrid();
};

/**
 * Caricamento piatti
 */
async function loadHomeMeals() {
  try {
    const data = await apiRequest('/meals');
    const rawList = Array.isArray(data) ? data : (data.meals || []);

    // De-duplicazione sicura per ID
    const uniqueMap = new Map();
    rawList.forEach(m => {
      const key = String(m._id || m.id);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, m);
      }
    });

    const uniqueList = Array.from(uniqueMap.values());

    // Ordina: prima i piatti disponibili, poi gli altri
    allMeals = uniqueList.sort((a, b) => {
      const aAvail = (Array.isArray(a.availableRestaurants) && a.availableRestaurants.length > 0) ? 1 : 0;
      const bAvail = (Array.isArray(b.availableRestaurants) && b.availableRestaurants.length > 0) ? 1 : 0;
      return bAvail - aAvail;
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

function updateSectionHeaders() {
  const badgeEl = document.getElementById('home-section-badge');
  const titleEl = document.getElementById('txt-popular-title');
  const subLabel = document.getElementById('user-pref-label');
  const role = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');
  const isIt = currentLang === 'IT';

  if (!titleEl) return;

  if (currentCategory) {
    if (badgeEl) badgeEl.textContent = isIt ? 'CATEGORIA SELEZIONATA' : 'SELECTED CATEGORY';
    titleEl.textContent = currentCategory.toUpperCase();
    if (subLabel) subLabel.textContent = isIt ? `Filtro attivo su ${currentCategory}` : `Filtered by ${currentCategory}`;
    return;
  }

  if (token && role === 'customer' && userFavoriteCategory) {
    if (badgeEl) badgeEl.textContent = isIt ? 'SCELTI PER TE' : 'RECOMMENDED FOR YOU';
    titleEl.textContent = `${isIt ? 'PIATTI A BASE DI' : 'DISHES WITH'} ${userFavoriteCategory.toUpperCase()}`;
    if (subLabel) subLabel.textContent = isIt ? `In base alla tua preferenza: ${userFavoriteCategory}` : `Based on your preference: ${userFavoriteCategory}`;
    return;
  }

  if (badgeEl) badgeEl.textContent = isIt ? 'IN EVIDENZA' : 'FEATURED';
  titleEl.textContent = isIt ? 'I PIÙ POPOLARI / DISPONIBILI ORA' : 'MOST POPULAR / AVAILABLE NOW';
  if (subLabel) subLabel.textContent = isIt ? 'I piatti pronti per l\'asporto nei ristoranti partner' : 'Takeout dishes ready at partner restaurants';
}

window.renderMealsGrid = function() {
  const grid = document.getElementById('meals-grid');
  if (!grid) return;

  const role = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');
  let list = [...allMeals];

  if (currentCategory) {
    list = list.filter(m => (m.strCategory || '').toLowerCase() === currentCategory.toLowerCase());
  } else if (token && role === 'customer' && userFavoriteCategory) {
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
    const noMealsMsg = currentLang === 'IT' ? 'Nessun piatto trovato per questa selezione.' : 'No meals found for this selection.';
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${noMealsMsg}</div>`;
    return;
  }

  grid.innerHTML = pageItems.map(m => {
    const hasRest = Array.isArray(m.availableRestaurants) && m.availableRestaurants.length > 0;
    const thumbUrl = m.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    const price = (Number(m.price) || 8.50).toFixed(2);
    const prepTime = m.preparationTime || 15;

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
            ${hasRest ? `
              <button type="button" class="btn-card-action btn-card-view" onclick="goToMealPage('${m._id}')">
                <i class="bi bi-eye"></i> ${currentLang === 'IT' ? 'VEDI' : 'VIEW'}
              </button>
              <button type="button" class="btn-card-action btn-card-cart" onclick="promptRestaurantSelection('${m._id}')">
                <i class="bi bi-bag-plus"></i> ${currentLang === 'IT' ? '+ CARRELLO' : '+ ADD'}
              </button>
            ` : `
              <button type="button" class="btn-card-action btn-card-view w-100" style="border-right: none;" onclick="goToMealPage('${m._id}')">
                <i class="bi bi-journal-bookmark"></i> ${currentLang === 'IT' ? 'VEDI SCHEDA' : 'VIEW RECIPE'}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.goToMealPage = function(mealId) {
  window.location.href = `meal.html?id=${encodeURIComponent(mealId)}`;
};

window.promptRestaurantSelection = function(mealId) {
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
  if (!selectedMealForCart) return;

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
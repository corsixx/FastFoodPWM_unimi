// public/js/catalog.js

const ITEMS_PER_PAGE = 8;
let currentPage = 1;

let currentCategory = '';
let currentSearch = '';
let currentSort = 'default';
let currentRestaurantFilter = '';
let rawMealsList = [];
let selectedMealForCart = null;

// Avvio coordinato dopo l'iniezione dei componenti da utils.js
document.addEventListener('componentsLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const restParam = urlParams.get('restaurant') || urlParams.get('restaurantId');
  if (restParam) {
    currentRestaurantFilter = restParam;
  }

  await loadBackendCategories();
  await loadFullCatalog();
  if (typeof setupBarMovement === 'function') setupBarMovement();
});

// Chiamato da toggleLanguage() in utils.js
window.updateView = function() {
  updateLanguageLabels();
  renderCatalogView();
};

function updateLanguageLabels() {
  const isIt = currentLang === 'IT';
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('txt-catalog-title', isIt ? 'MENU COMPLETO' : 'FULL MENU CATALOG');
  setT('btn-cat-all', isIt ? 'ALL / TUTTO' : 'ALL / FULL');
  setT('opt-sort-default', isIt ? 'Ordina: Predefinito' : 'Sort: Default');
  setT('opt-sort-price-asc', isIt ? 'Prezzo: Crescente' : 'Price: Low to High');
  setT('opt-sort-price-desc', isIt ? 'Prezzo: Decrescente' : 'Price: High to Low');
  setT('opt-sort-time', isIt ? 'Tempo preparazione' : 'Preparation time');
  setT('opt-sort-name', isIt ? 'Nome (A - Z)' : 'Name (A - Z)');
  setT('txt-rest-filter-label', isIt ? 'Menu del locale:' : 'Menu of partner:');
  setT('btn-reset-rest-filter', isIt ? 'Mostra Tutto il Menu ×' : 'Show Full Menu ×');

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.placeholder = isIt ? 'Cerca piatto o ingrediente...' : 'Search dish or ingredient...';
  }
}

async function loadBackendCategories() {
  const navContainer = document.getElementById('categories-nav');
  if (!navContainer) return;

  try {
    const categories = await apiRequest('/meals/categories');
    const allLabel = currentLang === 'IT' ? 'ALL / TUTTO' : 'ALL / FULL';

    if (Array.isArray(categories) && categories.length > 0) {
      const buttons = categories.map(cat => `
        <button class="nav-category-link ${currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" 
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
    console.error('Errore caricamento categorie:', err);
  }
}

async function loadFullCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  try {
    const res = await apiRequest('/meals');
    const rawData = Array.isArray(res) ? res : (res.meals || []);

    // De-duplicazione per ID
    const uniqueMap = new Map();
    rawData.forEach(m => {
      const key = String(m._id || m.id);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, m);
      }
    });

    rawMealsList = Array.from(uniqueMap.values());

    if (currentRestaurantFilter) {
      const banner = document.getElementById('restaurant-filter-banner');
      if (banner) banner.classList.remove('d-none');
    }

    currentPage = 1;
    updateLanguageLabels();
    renderCatalogView();
  } catch (err) {
    console.error('Errore chiamata catalogo:', err);
    grid.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore caricamento piatti dal database.</div>`;
  }
}

function getFilteredAndSortedMeals() {
  let list = [...rawMealsList];

  if (currentRestaurantFilter) {
    list = list.filter(m => 
      String(m.restaurantId) === String(currentRestaurantFilter) || 
      String(m.restaurant) === String(currentRestaurantFilter) ||
      (Array.isArray(m.availableRestaurants) && m.availableRestaurants.some(r => String(r._id || r) === String(currentRestaurantFilter)))
    );
  }

  if (currentCategory) {
    list = list.filter(m => m.strCategory && m.strCategory.toLowerCase() === currentCategory.toLowerCase());
  }

  if (currentSearch) {
    const term = currentSearch.toLowerCase();
    list = list.filter(m => 
      (m.strMeal && m.strMeal.toLowerCase().includes(term)) ||
      (m.strInstructions && m.strInstructions.toLowerCase().includes(term)) ||
      (Array.isArray(m.ingredients) && m.ingredients.some(i => i.toLowerCase().includes(term)))
    );
  }

  if (currentSort === 'price-asc') {
    list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (currentSort === 'price-desc') {
    list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else if (currentSort === 'time-asc') {
    list.sort((a, b) => (Number(a.preparationTime) || 0) - (Number(b.preparationTime) || 0));
  } else if (currentSort === 'name-asc') {
    list.sort((a, b) => (a.strMeal || '').localeCompare(b.strMeal || ''));
  }

  return list;
}

function renderCatalogView() {
  const allFiltered = getFilteredAndSortedMeals();
  const totalItems = allFiltered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const countLabel = document.getElementById('results-count');
  const isIt = currentLang === 'IT';
  if (countLabel) {
    countLabel.textContent = `${totalItems} ${isIt ? 'piatti trovati' : 'dishes found'}`;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageMeals = allFiltered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  renderMealsGrid(pageMeals);
  renderMinimalPagination(totalPages);
}

function renderMealsGrid(meals) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const isIt = currentLang === 'IT';

  if (meals.length === 0) {
    const noMsg = isIt ? 'NESSUN PIATTO TROVATO CON I FILTRI SELEZIONATI.' : 'NO DISHES FOUND MATCHING YOUR FILTERS.';
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${noMsg}</div>`;
    return;
  }

  grid.innerHTML = meals.map(m => {
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
                <i class="bi bi-eye"></i> ${isIt ? 'VEDI' : 'VIEW'}
              </button>
              <button type="button" class="btn-card-action btn-card-cart" onclick="promptRestaurantSelection('${m._id}')">
                <i class="bi bi-bag-plus"></i> ${isIt ? '+ CARRELLO' : '+ ADD'}
              </button>
            ` : `
              <button type="button" class="btn-card-action btn-card-view w-100" style="border-right: none;" onclick="goToMealPage('${m._id}')">
                <i class="bi bi-journal-bookmark"></i> ${isIt ? 'VEDI SCHEDA' : 'VIEW RECIPE'}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.goToMealPage = function(mealId) {
  window.location.href = `meal.html?id=${encodeURIComponent(mealId)}`;
};

function renderMinimalPagination(totalPages) {
  const container = document.getElementById('pagination-controls');
  const wrapper = document.getElementById('pagination-wrapper');
  if (!container || !wrapper) return;

  if (totalPages <= 1) {
    wrapper.classList.add('d-none');
    return;
  }

  wrapper.classList.remove('d-none');
  const isIt = currentLang === 'IT';
  const label = isIt ? 'PAG.' : 'PAGE';
  
  const currentFormatted = String(currentPage).padStart(2, '0');
  const totalFormatted = String(totalPages).padStart(2, '0');

  container.innerHTML = `
    <button class="page-arrow-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i>
    </button>
    <div class="page-counter-text">${label} ${currentFormatted} / ${totalFormatted}</div>
    <button class="page-arrow-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
      <i class="bi bi-chevron-right"></i>
    </button>
  `;
}

window.goToPage = function(page) {
  currentPage = page;
  renderCatalogView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.filterCategory = function(categoryName, btnElement) {
  currentCategory = categoryName;
  currentPage = 1;
  document.querySelectorAll('#categories-nav .nav-category-link').forEach(el => el.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderCatalogView();
};

window.handleSearchInput = function(e) {
  currentSearch = e.target.value.trim();
  currentPage = 1;
  renderCatalogView();
};

window.handleSort = function(val) {
  currentSort = val;
  renderCatalogView();
};

window.resetRestaurantFilter = function() {
  currentRestaurantFilter = '';
  const banner = document.getElementById('restaurant-filter-banner');
  if (banner) banner.classList.add('d-none');
  window.history.replaceState({}, document.title, 'catalog.html');
  currentPage = 1;
  renderCatalogView();
};

window.promptRestaurantSelection = function(mealId) {
  const meal = rawMealsList.find(m => String(m._id) === String(mealId));
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
      const msg = currentLang === 'IT' ? 'Nessun ristorante partner ha attualmente questo piatto in menu.' : 'No partner restaurant currently offers this dish.';
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